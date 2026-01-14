import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Price markup function: +33% with aggressive rounding
function calculateDropPrice(originalPrice: number): number {
  const markup = originalPrice * 1.33;
  
  // Aggressive rounding rules
  if (markup < 100) {
    return Math.ceil(markup / 5) * 5; // Round up to nearest 5
  } else if (markup < 500) {
    return Math.ceil(markup / 10) * 10; // Round up to nearest 10
  } else if (markup < 1000) {
    return Math.ceil(markup / 50) * 50; // Round up to nearest 50
  } else if (markup < 5000) {
    return Math.ceil(markup / 100) * 100; // Round up to nearest 100
  } else {
    return Math.ceil(markup / 500) * 500; // Round up to nearest 500
  }
}

// Parse XML to extract categories and products
function parseXML(xmlText: string) {
  const categories: Map<string, { id: string; name: string; parentId?: string }> = new Map();
  const products: any[] = [];
  
  // Parse categories
  const categoryRegex = /<category id="(\d+)"(?:\s+parentId="(\d+)")?>([^<]+)<\/category>/g;
  let match;
  while ((match = categoryRegex.exec(xmlText)) !== null) {
    categories.set(match[1], {
      id: match[1],
      name: match[3].trim(),
      parentId: match[2] || undefined
    });
  }
  
  // Parse offers/products
  const offerRegex = /<offer[^>]*id="(\d+)"[^>]*(?:group_id="(\d+)")?[^>]*>([\s\S]*?)<\/offer>/g;
  while ((match = offerRegex.exec(xmlText)) !== null) {
    const offerId = match[1];
    const groupId = match[2];
    const offerContent = match[3];
    
    // Extract product details
    const getName = (content: string) => {
      const m = content.match(/<name>([^<]+)<\/name>/);
      return m ? m[1].trim() : '';
    };
    
    const getDescription = (content: string) => {
      const m = content.match(/<description>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/description>/);
      if (m) return m[1].trim().replace(/<br\s*\/?>/g, '\n');
      const m2 = content.match(/<description>([^<]*)<\/description>/);
      return m2 ? m2[1].trim() : '';
    };
    
    const getPrice = (content: string) => {
      const m = content.match(/<price>([^<]+)<\/price>/);
      return m ? parseFloat(m[1]) : 0;
    };
    
    const getCategoryId = (content: string) => {
      const m = content.match(/<categoryId>([^<]+)<\/categoryId>/);
      return m ? m[1] : null;
    };
    
    const getPictures = (content: string) => {
      const pics: string[] = [];
      const picRegex = /<picture>([^<]+)<\/picture>/g;
      let pm;
      while ((pm = picRegex.exec(content)) !== null) {
        pics.push(pm[1]);
      }
      return pics;
    };
    
    const getVendorCode = (content: string) => {
      const m = content.match(/<vendorCode>([^<]+)<\/vendorCode>/);
      return m ? m[1] : null;
    };
    
    const getAvailable = (content: string) => {
      const m = content.match(/<available>([^<]+)<\/available>/);
      return m ? m[1] === 'true' : true;
    };
    
    const getQuantity = (content: string) => {
      const m = content.match(/<quantity_in_stock>([^<]+)<\/quantity_in_stock>/);
      return m ? parseInt(m[1]) : null;
    };
    
    const getParam = (content: string, name: string) => {
      const regex = new RegExp(`<param name="${name}"[^>]*>([^<]+)<\/param>`);
      const m = content.match(regex);
      return m ? m[1] : null;
    };
    
    const originalPrice = getPrice(offerContent);
    const dropPrice = calculateDropPrice(originalPrice);
    
    products.push({
      external_id: offerId,
      group_id: groupId,
      name: getName(offerContent),
      description: getDescription(offerContent),
      price: dropPrice,
      original_price: originalPrice,
      category_external_id: getCategoryId(offerContent),
      images: getPictures(offerContent),
      vendor_code: getVendorCode(offerContent),
      in_stock: getAvailable(offerContent),
      stock_quantity: getQuantity(offerContent),
      size: getParam(offerContent, 'Размер') || getParam(offerContent, 'Розмір'),
    });
  }
  
  return { categories: Array.from(categories.values()), products };
}

// Create URL-safe slug from name
function createSlug(name: string): string {
  const translitMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye',
    'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l',
    'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu',
    'я': 'ya', 'ы': 'y', 'э': 'e', 'ё': 'yo',
  };
  
  return name
    .toLowerCase()
    .split('')
    .map(char => translitMap[char] || char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { xml_url, supplier_id } = await req.json();
    
    if (!xml_url) {
      throw new Error('XML URL is required');
    }

    console.log('Fetching XML from:', xml_url);
    
    // Fetch XML content
    const xmlResponse = await fetch(xml_url);
    if (!xmlResponse.ok) {
      throw new Error(`Failed to fetch XML: ${xmlResponse.status}`);
    }
    const xmlText = await xmlResponse.text();
    
    console.log('XML fetched, size:', xmlText.length);
    
    // Parse XML
    const { categories, products } = parseXML(xmlText);
    
    console.log(`Parsed ${categories.length} categories and ${products.length} products`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Create import log
    const { data: importLog, error: logError } = await supabase
      .from('import_logs')
      .insert({
        supplier_id,
        status: 'processing',
        total_products: products.length,
      })
      .select()
      .single();
    
    if (logError) {
      console.error('Import log error:', logError);
    }
    
    // Insert/update categories
    const categoryIdMap = new Map<string, string>();
    
    // First pass: insert parent categories
    for (const cat of categories.filter(c => !c.parentId)) {
      const slug = createSlug(cat.name) + '-' + cat.id;
      const { data, error } = await supabase
        .from('categories')
        .upsert({
          external_id: cat.id,
          name: cat.name,
          slug,
          is_active: true,
        }, { onConflict: 'external_id' })
        .select()
        .single();
      
      if (data) {
        categoryIdMap.set(cat.id, data.id);
      }
      if (error) console.error('Category insert error:', error);
    }
    
    // Second pass: insert child categories
    for (const cat of categories.filter(c => c.parentId)) {
      const parentUuid = categoryIdMap.get(cat.parentId!);
      const slug = createSlug(cat.name) + '-' + cat.id;
      const { data, error } = await supabase
        .from('categories')
        .upsert({
          external_id: cat.id,
          name: cat.name,
          slug,
          parent_id: parentUuid,
          is_active: true,
        }, { onConflict: 'external_id' })
        .select()
        .single();
      
      if (data) {
        categoryIdMap.set(cat.id, data.id);
      }
      if (error) console.error('Child category insert error:', error);
    }
    
    // Fetch all categories for ID mapping
    const { data: allCategories } = await supabase
      .from('categories')
      .select('id, external_id');
    
    if (allCategories) {
      for (const cat of allCategories) {
        if (cat.external_id) {
          categoryIdMap.set(cat.external_id, cat.id);
        }
      }
    }
    
    // Group products by group_id to combine sizes
    const productGroups = new Map<string, any[]>();
    for (const product of products) {
      const key = product.group_id || product.external_id;
      if (!productGroups.has(key)) {
        productGroups.set(key, []);
      }
      productGroups.get(key)!.push(product);
    }
    
    // Insert products (grouped)
    let importedCount = 0;
    let failedCount = 0;
    
    for (const [groupKey, groupProducts] of productGroups) {
      const firstProduct = groupProducts[0];
      const sizes = [...new Set(groupProducts.map(p => p.size).filter(Boolean))];
      const totalStock = groupProducts.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
      const inStock = groupProducts.some(p => p.in_stock);
      
      const categoryId = firstProduct.category_external_id 
        ? categoryIdMap.get(firstProduct.category_external_id) 
        : null;
      
      const { error } = await supabase
        .from('products')
        .upsert({
          external_id: firstProduct.external_id,
          group_id: firstProduct.group_id,
          supplier_id,
          category_id: categoryId,
          name: firstProduct.name,
          description: firstProduct.description,
          price: firstProduct.price,
          original_price: firstProduct.original_price,
          currency: 'UAH',
          vendor_code: firstProduct.vendor_code,
          sizes: sizes.length > 0 ? sizes : null,
          images: firstProduct.images,
          in_stock: inStock,
          stock_quantity: totalStock,
        }, { onConflict: 'external_id' });
      
      if (error) {
        console.error('Product insert error:', error);
        failedCount++;
      } else {
        importedCount++;
      }
    }
    
    // Update import log
    if (importLog) {
      await supabase
        .from('import_logs')
        .update({
          status: 'completed',
          imported_products: importedCount,
          failed_products: failedCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', importLog.id);
    }
    
    // Update category product counts
    await supabase.rpc('update_category_counts');
    
    return new Response(
      JSON.stringify({
        success: true,
        categories_count: categories.length,
        products_count: importedCount,
        failed_count: failedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('Parse XML error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
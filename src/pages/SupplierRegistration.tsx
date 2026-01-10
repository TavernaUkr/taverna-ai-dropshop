import { useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, Building, User, Mail, Phone, FileText, Globe, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type SupplierType = "individual" | "company";

interface SupplierFormData {
  type: SupplierType;
  fullName: string;
  companyName?: string;
  taxId: string; // ІПН для фізосіб, ЄДРПОУ для юросіб
  email: string;
  phone: string;
  shopName: string;
  xmlUrl?: string;
  telegram?: string;
  description?: string;
  agreeToTerms: boolean;
}

const SupplierRegistration = () => {
  const [step, setStep] = useState(1);
  const [supplierType, setSupplierType] = useState<SupplierType | null>(null);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<SupplierFormData>();
  
  const onSubmit = (data: SupplierFormData) => {
    console.log("Form data:", data);
    toast.success("Заявку надіслано! Ми зв'яжемось з вами найближчим часом.");
    // Here would be API call to register supplier
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button 
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-foreground">Стати партнером</h1>
        </div>
      </header>

      <main className="px-4 py-6 pb-24">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Choose Type */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Тип партнера</h2>
              <p className="text-sm text-muted-foreground">
                Оберіть, як ви будете працювати з Taverna Group
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setSupplierType("individual");
                  setStep(2);
                }}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-foreground">Фізична особа</h3>
                  <p className="text-sm text-muted-foreground">ФОП або самозайнята особа</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>

              <button
                onClick={() => {
                  setSupplierType("company");
                  setStep(2);
                }}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                  <Building className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-foreground">Юридична особа</h3>
                  <p className="text-sm text-muted-foreground">ТОВ, ПП або інша організація</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 bg-muted rounded-xl">
              <p className="text-xs text-muted-foreground">
                <strong>Важливо:</strong> Відповідно до законодавства України, для продажу товарів необхідна реєстрація ФОП (2 група) або юридичної особи.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Contact Info */}
        {step === 2 && (
          <form className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Контактні дані</h2>
              <p className="text-sm text-muted-foreground">
                {supplierType === "individual" ? "Дані фізичної особи-підприємця" : "Дані вашої компанії"}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  ПІБ {supplierType === "company" && "контактної особи"} *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    {...register("fullName", { required: true })}
                    type="text"
                    placeholder="Іваненко Іван Іванович"
                    className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {supplierType === "company" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Назва компанії *</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      {...register("companyName", { required: supplierType === "company" })}
                      type="text"
                      placeholder="ТОВ 'Назва компанії'"
                      className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {supplierType === "individual" ? "ІПН (10 цифр)" : "Код ЄДРПОУ (8 цифр)"} *
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    {...register("taxId", { 
                      required: true,
                      pattern: supplierType === "individual" ? /^\d{10}$/ : /^\d{8}$/
                    })}
                    type="text"
                    placeholder={supplierType === "individual" ? "1234567890" : "12345678"}
                    className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    {...register("email", { required: true, pattern: /^\S+@\S+$/i })}
                    type="email"
                    placeholder="partner@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Телефон *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    {...register("phone", { required: true })}
                    type="tel"
                    placeholder="+380 XX XXX XX XX"
                    className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Далі
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Shop Info */}
        {step === 3 && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Інформація про магазин</h2>
              <p className="text-sm text-muted-foreground">
                Розкажіть про ваш дроп-магазин
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Назва магазину в Taverna *</label>
                <input
                  {...register("shopName", { required: true })}
                  type="text"
                  placeholder="Мій крутий магазин"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Посилання на XML-фід (MyDrop, Prom, тощо)</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    {...register("xmlUrl")}
                    type="url"
                    placeholder="https://mydrop.com.ua/export/..."
                    className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Telegram для зв'язку</label>
                <input
                  {...register("telegram")}
                  type="text"
                  placeholder="@your_telegram"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Опис вашого магазину</label>
                <textarea
                  {...register("description")}
                  rows={4}
                  placeholder="Розкажіть про асортимент, переваги..."
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <label className="flex items-start gap-3 p-4 bg-muted rounded-xl cursor-pointer">
                <input
                  {...register("agreeToTerms", { required: true })}
                  type="checkbox"
                  className="mt-0.5 w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">
                  Я погоджуюся з <a href="#" className="text-primary underline">Умовами використання</a> та{" "}
                  <a href="#" className="text-primary underline">Політикою конфіденційності</a> Taverna Group
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
              >
                Назад
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Надіслати заявку
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default SupplierRegistration;

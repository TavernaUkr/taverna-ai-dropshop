import { Navigate } from "react-router-dom";

/** Бонусний рахунок об'єднано з єдиним рахунком Taverna. */
export default function BonusAccount() {
  return <Navigate to="/wallet" replace />;
}

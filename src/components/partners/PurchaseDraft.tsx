import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { PartnerCartItem } from "@/lib/partners";
export const emptyPartnerAddress = {
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "SP",
  complemento: "",
};
export type PartnerCartLine = PartnerCartItem & { key: string };
type Address = typeof emptyPartnerAddress;
type Coordinates = { latitude: string; longitude: string };
type Draft = {
  cart: PartnerCartLine[];
  setCart: Dispatch<SetStateAction<PartnerCartLine[]>>;
  address: Address;
  setAddress: Dispatch<SetStateAction<Address>>;
  fulfillment: "delivery" | "pickup";
  setFulfillment: Dispatch<SetStateAction<"delivery" | "pickup">>;
  coordinates: Coordinates;
  setCoordinates: Dispatch<SetStateAction<Coordinates>>;
};
const DraftContext = createContext<Draft | null>(null);
export function PurchaseDraftProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<PartnerCartLine[]>([]);
  const [address, setAddress] = useState(emptyPartnerAddress);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [coordinates, setCoordinates] = useState({ latitude: "", longitude: "" });
  return (
    <DraftContext.Provider
      value={{
        cart,
        setCart,
        address,
        setAddress,
        fulfillment,
        setFulfillment,
        coordinates,
        setCoordinates,
      }}
    >
      {children}
    </DraftContext.Provider>
  );
}
export function usePurchaseDraft() {
  const draft = useContext(DraftContext);
  if (!draft) throw new Error("Abra o painel do parceiro para montar a compra.");
  return draft;
}

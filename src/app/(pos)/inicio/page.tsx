import { HomeView } from "@/modules/home/components/home-view";
import { isProofStorageEnabled } from "@/server/storage/proof-blob";

// Sin permiso concreto: todo usuario con acceso al sistema tiene Inicio (el layout ya exige sesión y usuario activo).
export default function HomePage() {
  return <HomeView proofEnabled={isProofStorageEnabled()} />;
}

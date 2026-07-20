import { Navigate, Route, Routes } from "react-router-dom";
import BrandingShell from "./components/BrandingShell.jsx";
import FoundationsPage from "./pages/FoundationsPage.jsx";
import CampaignArchivePage from "./pages/CampaignArchivePage.jsx";
import LoreEntryPage from "./pages/LoreEntryPage.jsx";
import CharacterDossierPage from "./pages/CharacterDossierPage.jsx";
import DiceWorkspacePage from "./pages/DiceWorkspacePage.jsx";
import InvitationsPage from "./pages/InvitationsPage.jsx";

export default function BrandingApp() {
  return (
    <BrandingShell>
      <Routes>
        <Route index element={<Navigate to="/foundations" replace />} />
        <Route path="/foundations" element={<FoundationsPage />} />
        <Route path="/archive" element={<CampaignArchivePage />} />
        <Route path="/entry" element={<LoreEntryPage />} />
        <Route path="/character" element={<CharacterDossierPage />} />
        <Route path="/dice" element={<DiceWorkspacePage />} />
        <Route path="/invitations" element={<InvitationsPage />} />
        <Route path="*" element={<Navigate to="/foundations" replace />} />
      </Routes>
    </BrandingShell>
  );
}

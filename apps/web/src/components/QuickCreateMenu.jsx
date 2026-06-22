import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

function editorPath(activeWorld) {
  return activeWorld?.title ? `/editor?world=${encodeURIComponent(activeWorld.title)}` : "/editor";
}

export default function QuickCreateMenu({ activeWorld = null }) {
  const title = activeWorld?.title ? `Создать в мире: ${activeWorld.title}` : "Создать статью";
  return <Link className="icon-command" to={editorPath(activeWorld)} title={title}><Plus size={18} /></Link>;
}

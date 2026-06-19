import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export default function QuickCreateMenu() {
  return <Link className="icon-command" to="/editor" title="Create entry"><Plus size={18} /></Link>;
}

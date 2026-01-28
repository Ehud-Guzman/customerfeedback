import { useNavigate } from "react-router-dom";
import { smartBack } from "../lib/nav";

export default function BackButton({ to, label = "Back" }) {
  const nav = useNavigate();

  const onClick = () => {
    if (to) nav(to);
    else smartBack(nav);
  };

  return (
    <button type="button" className="btn-secondary" onClick={onClick}>
      ← {label}
    </button>
  );
}

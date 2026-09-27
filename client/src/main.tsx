import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { savePrerenderedHtml } from "./prerendered";

const rootElement = document.getElementById("root")!;
savePrerenderedHtml(rootElement);
createRoot(rootElement).render(<App />);

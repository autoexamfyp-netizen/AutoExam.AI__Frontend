import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import "./index.css"
import RootRouter from "./RootRouter"
import { AuthProvider } from "./context/AuthProvider"
import { LoadingProvider } from "./context/LoadingProvider"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <LoadingProvider>
        <AuthProvider>
          <RootRouter />
        </AuthProvider>
      </LoadingProvider>
    </BrowserRouter>
  </StrictMode>,
)

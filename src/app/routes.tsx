import { createBrowserRouter } from "react-router";
import AppRoot from "./AppRoot";
import Login from "./components/Login";
import CanvasArea from "./components/CanvasArea";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppRoot,
    children: [
      { index: true, Component: Login },
      { path: "canvas", Component: CanvasArea },
    ],
  },
]);

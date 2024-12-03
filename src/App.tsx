import { GraphDesigner } from "@/components/GraphDesigner";
import { Header } from "./components/Header";

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="container mx-auto p-4">
        <GraphDesigner />
      </div>
    </div>
  );
}

export default App;

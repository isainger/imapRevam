import chainLogo from "./assets/chainLogo.png";
import logo from "./assets/logo.png";
import rightLogo from "./assets/rightLogo.png";
import "./App.css";
import Bar from "./Bar";

function App() {
  return (
    <div className="relative w-full min-h-screen">
      <div className="banner w-full justify-center items-center flex p-10">
        <div className="flex flex-col w-full justify-center items-center font-extrabold gap-4">
          <p className="text-5xl">Taboola Incident Management Platform</p>
          <p className="text-xl">
            Internal system for incident communication & reporting
          </p>
        </div>
      </div>

      {/* FORM IN MIDDLE - Responsive + scrollable */}
<div className="relative w-full flex justify-center items-center min-h-[calc(100vh-250px)] py-8 sm:px-6 lg:px-10">
        <Bar />
      </div>
    </div>
  );
}

export default App;

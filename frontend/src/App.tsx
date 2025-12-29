import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./layouts/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import StartTest from "./pages/StartTest";
import Tests from "./pages/Tests";
import TakeTest from "./pages/TakeTest";
import TestResult from "./pages/TestResult";
import Signup from "./pages/Signup";
import Signin from "./pages/Signin";
import UploadPdf from "./pages/UploadPdf";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Signin />} />
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/start-test" element={<StartTest />} />
                <Route path="/test" element={<Tests />} />
                <Route path="/test/available" element={<Tests />} />
                <Route path="/test/:testId/take" element={<TakeTest />} />
                <Route path="/test/:attemptId/result" element={<TestResult />} />
                <Route path="/upload-pdf" element={<UploadPdf />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

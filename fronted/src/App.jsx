import React from 'react';
import { motion } from 'framer-motion';

const App = () => {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4">🌕 MOZA Moonbase</h1>
      <motion.div
        className="grid grid-cols-3 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-gray-800 p-4 rounded-xl shadow">☀️ Solar Panels</div>
        <div className="bg-gray-800 p-4 rounded-xl shadow">🚀 Launchpad</div>
        <div className="bg-gray-800 p-4 rounded-xl shadow">🔬 Research Lab</div>
        <div className="bg-gray-800 p-4 rounded-xl shadow">🛡️ Defense Tower</div>
        <div className="bg-gray-800 p-4 rounded-xl shadow">🏦 Crypto Bank</div>
        <div className="bg-gray-800 p-4 rounded-xl shadow">🚉 Transport Hub</div>
      </motion.div>
    </main>
  );
};

export default App;
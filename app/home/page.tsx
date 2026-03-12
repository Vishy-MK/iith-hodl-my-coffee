import React from 'react';

const HomePage = () => {
  return (
    <div className="h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-5xl font-bold mb-4">Welcome to the Home Page</h1>
        <p className="text-lg mb-8">This is a dummy home page for demonstration purposes.</p>
        <button className="bg-white text-blue-500 font-bold py-2 px-4 rounded hover:bg-gray-200">
          Explore
        </button>
      </div>
    </div>
  );
};

export default HomePage;
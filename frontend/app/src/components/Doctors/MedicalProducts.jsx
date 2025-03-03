import { useState } from 'react';
import Slidebar from "../../pages/Slidebar";
import { FiPackage, FiSearch, FiFilter } from "react-icons/fi";

const MedicalProducts = () => {
  const [activeTab, setActiveTab] = useState("medical_products");
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");

  const products = [
    {
      name: "Digital Stethoscope",
      category: "Equipment",
      price: "$199.99",
      description: "Advanced digital stethoscope with noise cancellation",
      image: "/images/products/stethoscope.jpg",
      stock: 15
    },
    {
      name: "Surgical Masks (Box of 50)",
      category: "Supplies",
      price: "$24.99",
      description: "High-quality disposable surgical masks",
      image: "/images/products/masks.jpg",
      stock: 100
    },
    {
      name: "Blood Pressure Monitor",
      category: "Equipment",
      price: "$89.99",
      description: "Digital automatic blood pressure monitor",
      image: "/images/products/bp-monitor.jpg",
      stock: 25
    },
    // Add more products as needed
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === "all" || product.category.toLowerCase() === category.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <Slidebar userType="doctor" activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 p-8 overflow-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-blue-700 flex items-center">
            <FiPackage className="mr-2 text-green-600" />
            Medical Products
          </h2>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="w-48">
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="equipment">Equipment</option>
                <option value="supplies">Supplies</option>
                <option value="medicines">Medicines</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-all hover:scale-105 border border-blue-100 hover:border-green-200">
              <div className="h-48 bg-gradient-to-r from-blue-100 to-green-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/400x200?text=Product+Image";
                  }}
                />
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-blue-700">{product.name}</h3>
                  <span className="text-green-600 font-semibold">{product.price}</span>
                </div>
                <p className="text-gray-600 mb-4">{product.description}</p>
                <div className="flex justify-between items-center">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {product.category}
                  </span>
                  <span className="text-gray-600 text-sm">
                    Stock: {product.stock}
                  </span>
                </div>
                <button className="mt-4 w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-2 rounded-lg hover:from-blue-600 hover:to-green-600 transition-all">
                  Order Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MedicalProducts; 
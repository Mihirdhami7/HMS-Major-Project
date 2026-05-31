export default function ContactUs() {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="grid md:grid-cols-2 gap-6 bg-white rounded-2xl shadow-lg">
          {/* Left Section with Illustration */}
          <div className="flex justify-center items-center p-6 bg-[rgb(215,242,229)] rounded-l-2xl">
            <img
              src="https://via.placeholder.com/400" // Replace this with your image URL
              alt="Contact Illustration"
              className="w-full h-auto"
            />
          </div>
  
          {/* Right Section with Form */}
          <div className="p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Contact</h2>
            <p className="text-lg text-[rgb(105,129,233)]">Connect With Us</p>
            <form className="space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                className="w-full p-3 bg-[rgb(224,252,253)] rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
              />
              <input
                type="email"
                placeholder="Your Email"
                className="w-full p-3 bg-[rgb(224,252,253)] rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
              />
              <div>
                <label className="block text-gray-600 mb-1">Attach File</label>
                <input
                  type="file"
                  className="w-full bg-[rgb(224,252,253)] p-2 rounded-lg"
                />
              </div>
              <textarea
                rows="4"
                placeholder="Write Message Here..."
                className="w-full p-3 bg-[rgb(224,252,253)] rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
              ></textarea>
              <button
                type="submit"
                className="w-full bg-[rgb(94,105,230)] text-white py-3 rounded-lg hover:bg-[rgb(150,158,244)] transition"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }
  
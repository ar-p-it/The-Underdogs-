import { Link } from "react-router-dom";
import { FaRobot, FaMoneyBill, FaUsers, FaChartPie, FaBell, FaDivide, FaBolt } from "react-icons/fa";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-black">

      {/* Hero - Centered robot image with text below */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center text-center gap-6">
          {/* Landing hero video */}
          <video
            src="/landingvideo.mp4"
            className="w-full max-w-md rounded-box shadow"
            autoPlay
            loop
            muted
            playsInline
          >
            Your browser does not support the video tag.
          </video>
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight text-black">
              Don't just track debts. Settle them instantly.
            </h1>
            <p className="py-6 text-lg text-black/70">
              The first group expense manager with built-in programmable payments. Pool funds, set rules, and automate settlements.
            </p>
            <Link to="/signup" className="btn bg-emerald-500 border-none btn-lg">Get Started</Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Everything you need to split expenses</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card bg-white shadow-xl transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <FaUsers className="text-emerald-600 w-6 h-6" />
                <h3 className="card-title">Group Expenses</h3>
              </div>
              <p>Manage shared costs for trips, dinners, and events.</p>
            </div>
          </div>
          <div className="card bg-white shadow-xl transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <FaMoneyBill className="text-emerald-600 w-6 h-6" />
                <h3 className="card-title">Smart Settlements</h3>
              </div>
              <p>Automate who owes whom and settle instantly.</p>
            </div>
          </div>
          <div className="card bg-white shadow-xl transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <FaChartPie className="text-emerald-600 w-6 h-6" />
                <h3 className="card-title">Expense Analytics</h3>
              </div>
              <p>Insights by category, member, and timeline.</p>
            </div>
          </div>
          <div className="card bg-white shadow-xl transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <FaBell className="text-emerald-600 w-6 h-6" />
                <h3 className="card-title">Payment Reminders</h3>
              </div>
              <p>Never miss a payment with smart nudges.</p>
            </div>
          </div>
          <div className="card bg-white shadow-xl transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <FaDivide className="text-emerald-600 w-6 h-6" />
                <h3 className="card-title">Multiple Split Types</h3>
              </div>
              <p>Equal, percentage, shares, or custom splits.</p>
            </div>
          </div>
          <div className="card bg-white shadow-xl transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <FaBolt className="text-emerald-600 w-6 h-6" />
                <h3 className="card-title">Real-time Updates</h3>
              </div>
              <p>See changes instantly across all members.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Splitting expenses has never been easier</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card bg-white shadow transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="card-body items-center text-center">
              <div className="badge bg-emerald-500 border-none text-white mb-3">1</div>
              <h3 className="card-title">Create or Join a Group</h3>
              <p>Invite friends and set up your shared space.</p>
            </div>
          </div>
          <div className="card bg-white shadow transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="card-body items-center text-center">
              <div className="badge bg-emerald-500 border-none text-white mb-3">2</div>
              <h3 className="card-title">Add Expenses</h3>
              <p>Scan bills or add expenses in seconds.</p>
            </div>
          </div>
          <div className="card bg-white shadow transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="card-body items-center text-center">
              <div className="badge bg-emerald-500 border-none text-white mb-3">3</div>
              <h3 className="card-title">Settle Up</h3>
              <p>Smart suggestions and instant settlements.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {/* <section className="container mx-auto px-4 pb-16">
        <h2 className="text-3xl font-bold text-center mb-8">What our users are saying</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[1,2,3].map((i) => (
            <div key={i} className="card bg-white shadow transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="avatar placeholder">
                    <div className="bg-emerald-100 text-emerald-700 rounded-full w-12">
                      <span className="text-lg">{i}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">Babu Rao</h3>
                    <p className="text-sm opacity-70">Verified user</p>
                  </div>
                </div>
                <p className="mt-3">"Ye babu rao ka style hai!"</p>
              </div>
            </div>
          ))}
        </div>
      </section> */}

      {/* Bottom CTA */}
      <section className="border-t">
        <div className="container mx-auto px-4 py-12 text-center text-black">
          <h2 className="text-3xl font-bold mb-4">Ready to simplify expense sharing?</h2>
          <Link to="/signup" className="btn bg-white text-emerald-600 border-none">Get Started</Link>
        </div>
      </section>
    </div>
  );
}

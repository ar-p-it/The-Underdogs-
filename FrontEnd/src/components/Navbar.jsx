import { Link } from "react-router-dom";
// import { SignedIn, SignedOut, SignOutButton } from "@clerk/clerk-react";
export default function Navbar() {
return (
    <div className="navbar sticky top-0 z-40 bg-white/60 backdrop-blur-md border-base-200">
        <div className="container mx-auto px-4 flex items-center justify-between gap-4">
            {/* Left */}
            <div className="flex items-center">
                <Link to="/" className="text-3xl font-extrabold tracking-tight text-emerald-600">
                    Cooper
                </Link>
            </div>

            {/* Center (hidden on small) */}
            <div className="hidden md:flex items-center gap-6">
               
            </div>

                        {/* Right */}
                                <div className="flex items-center gap-2">
                                        
                                            <Link to="/login" className="btn btn-link text-emerald-600 no-underline">Sign In</Link>
                                            <Link to="/signup" className="btn btn-primary bg-emerald-500 border-none text-white">Sign Up</Link>
                                        
                                        {/* <SignedIn>
                                            <SignOutButton signOutCallback={() => navigate('/') }>
                                                <button className="btn btn-outline border-emerald-500 text-emerald-600">Logout</button>
                                            </SignOutButton> */}
                                        {/* </SignedIn> */}
                                </div>
        </div>
    </div>
);
}

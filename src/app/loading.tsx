export default function Loading() {
  return (
    
        <div className="flex h-screen bg-black font-sans items-center justify-center">
          <div className="text-center">
            <div className="mb-6">
              {/* Echo Logo */}
              <div className="relative inline-block">
                <div className="font-jersey text-[64px] font-normal text-white">
                  echo
                </div>
                <svg
                  width="13"
                  height="34"
                  className="absolute left-[116px] top-[34px]"
                  fill="none"
                >
                  <path
                    d="M2 2C14.2659 13.7159 13.7311 20.2841 2 32"
                    stroke="white"
                    strokeWidth="4"
                  />
                </svg>
                <svg
                  width="16"
                  height="46"
                  className="absolute left-[120px] top-[28px]"
                  fill="none"
                >
                  <path
                    d="M2 2C18.3545 18.4022 17.6415 27.5977 2 44"
                    stroke="white"
                    strokeWidth="4"
                  />
                </svg>
              </div>
            </div>

            {/* Loading Spinner */}
          
              <div className="mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
              </div>
            

            
          </div>
        </div>
  );
}

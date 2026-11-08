import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/hooks/userAuth";
import keycloak from "@/services/keycloak";

const Profile = () => {
  const { isAuthenticated } = useAuth();
  
  // Get user profile from Keycloak token
  const userProfile = isAuthenticated ? keycloak.tokenParsed : null;
  const avatarUrl = userProfile?.picture || userProfile?.avatar;
  const locale = userProfile?.attributes?.locale?.[0] || 'Not specified';

  return (
    <div className="h-full bg-gray-900 flex flex-col items-center py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-8 px-4 bg-blue-900">
          <div className="relative w-24 h-24 mb-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-full h-full rounded-full object-cover border-4 border-orange-400"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center border-4 border-orange-400">
                <FontAwesomeIcon 
                  icon={faUser} 
                  className="text-orange-300 text-4xl" 
                />
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-orange-300">
            {userProfile?.firstName} {userProfile?.lastName}
          </h2>
          <p className="text-blue-200">{userProfile?.email}</p>
        </div>

        {/* Profile Details Section */}
        <div className="p-6 space-y-4">
          <div className="border-b border-gray-700 pb-4">
            <h3 className="text-lg font-medium text-orange-400 mb-2">
              Account Information
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-blue-200">
                  Username
                </label>
                <div className="mt-1 text-white bg-gray-700 px-3 py-2 rounded-md">
                  {userProfile?.username}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-200">
                  Email Verified
                </label>
                <div className="mt-1 text-white bg-gray-700 px-3 py-2 rounded-md">
                  {userProfile?.emailVerified ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-700 pb-4">
            <h3 className="text-lg font-medium text-orange-400 mb-2">
              Personal Information
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-blue-200">
                  First Name
                </label>
                <div className="mt-1 text-white bg-gray-700 px-3 py-2 rounded-md">
                  {userProfile?.firstName || 'Not specified'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-200">
                  Last Name
                </label>
                <div className="mt-1 text-white bg-gray-700 px-3 py-2 rounded-md">
                  {userProfile?.lastName || 'Not specified'}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-orange-400 mb-2">
              Preferences
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-blue-200">
                  Language/Locale
                </label>
                <div className="mt-1 text-white bg-gray-700 px-3 py-2 rounded-md">
                  {locale}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
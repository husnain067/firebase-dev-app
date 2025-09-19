import { useCallback, useEffect, useState } from "react";
import {
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged,
    browserLocalPersistence,
    setPersistence,
} from "firebase/auth";
import type { Unsubscribe, User } from "firebase/auth";
import { auth } from "./firebase";

// Extend the Window interface to include FlutterChannel
declare global {
    interface Window {
        FlutterChannel?: {
            postMessage: (message: string) => void;
        };
    }
}

export default function GoogleAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFlutterEnvironment, setIsFlutterEnvironment] = useState(false);

    // Check if we're running inside Flutter WebView
    const checkFlutterEnvironment = useCallback(() => {
        const hasFlutterChannel = window.FlutterChannel !== undefined;
        const hasLocalStorageToken = localStorage.getItem('access_token') !== null;
        return hasFlutterChannel || hasLocalStorageToken;
    }, []);

    // Handle Flutter authentication data
    const handleFlutterAuth = useCallback((event: Event) => {
        const customEvent = event as CustomEvent<{ userInfo: any }>;
        console.log("[FLUTTER] Received auth data:", customEvent.detail);


        const userInfo = customEvent.detail?.userInfo;

        if (userInfo) {
            // Create a User-like object for consistency
            const flutterUser = {
                uid: userInfo.id,
                displayName: userInfo.name,
                email: userInfo.email,
                photoURL: userInfo.picture,
                emailVerified: userInfo.verified_email || true
            };

            setUser(flutterUser as User);
            setLoading(false);
        }
    }, []);

    // Check for existing Flutter token and user data
    const checkExistingFlutterAuth = useCallback(() => {
        const userInfoStr = localStorage.getItem('user_info');

        if (userInfoStr) {
            try {
                const userInfo = JSON.parse(userInfoStr);
                console.log("[FLUTTER] Found existing user data");

                const flutterUser = {
                    uid: userInfo.id,
                    displayName: userInfo.name,
                    email: userInfo.email,
                    photoURL: userInfo.picture,
                    emailVerified: userInfo.verified_email || true
                };

                setUser(flutterUser as User);

            } catch (error) {
                console.error("[FLUTTER] Error parsing stored user data:", error);
                localStorage.removeItem('access_token');
                localStorage.removeItem('user_info');
            }
        }

        setLoading(false);
    }, []);

    // Your existing Firebase redirect result handler
    const handleRedirectResult = useCallback(async () => {
        try {
            const result = await getRedirectResult(auth);
            if (result) {
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const token = credential?.accessToken;
                console.log("[FIREBASE] Redirect result found:", {
                    user: result.user.email,
                    hasCredential: !!credential,
                    hasToken: !!token
                });
            }
        } catch (error) {
            console.error("[FIREBASE] Error in getRedirectResult:", error);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const initializeAuth = async () => {
            // Check if we're in Flutter environment first
            const inFlutter = checkFlutterEnvironment();
            setIsFlutterEnvironment(inFlutter);

            if (inFlutter) {
                console.log("[FLUTTER] Flutter environment detected");

                // Listen for Flutter auth events
                window.addEventListener('authTokenReady', handleFlutterAuth);
                window.addEventListener('flutterAuthReady', handleFlutterAuth);

                // Check for existing Flutter auth data
                checkExistingFlutterAuth();

            } else {
                console.log("[FIREBASE] Web environment detected");

                // Your existing Firebase auth logic
                try {
                    await setPersistence(auth, browserLocalPersistence);
                    await handleRedirectResult();
                } catch (error) {
                    console.error("[FIREBASE] Error initializing auth:", error);
                }
            }
        };

        // Firebase auth state listener (only for web)
        let unsubscribe: Unsubscribe;
        if (!checkFlutterEnvironment()) {
            unsubscribe = onAuthStateChanged(auth, (currentUser) => {
                if (isMounted) {
                    setUser(currentUser);
                    setLoading(false);
                }
            });
        }

        initializeAuth();

        return () => {
            isMounted = false;
            if (unsubscribe) unsubscribe();
            window.removeEventListener('authTokenReady', handleFlutterAuth);
            window.removeEventListener('flutterAuthReady', handleFlutterAuth);
        };
    }, [handleRedirectResult, handleFlutterAuth, checkExistingFlutterAuth, checkFlutterEnvironment]);

    // Handle sign in - different logic for Flutter vs Web
    const handleSignIn = () => {
        if (isFlutterEnvironment) {
            // In Flutter, show message that auth should be done through Flutter app
            alert("Please use the 'Sign In' button in the Flutter app to authenticate.");
            return;
        }

        // Your existing Firebase sign in logic
        setLoading(true);
        const provider = new GoogleAuthProvider();
        provider.addScope("profile");
        provider.addScope("email");
        signInWithRedirect(auth, provider);
    };

    // Handle sign out - different logic for Flutter vs Web
    const handleSignOut = () => {
        if (isFlutterEnvironment) {
            // Clear Flutter auth data
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_info');
            sessionStorage.clear();
            setUser(null);

            // Notify Flutter app if possible
            if (window.FlutterChannel) {
                window.FlutterChannel.postMessage(JSON.stringify({
                    type: 'logout_requested',
                    timestamp: Date.now()
                }));
            }
        } else {
            // Your existing Firebase sign out
            signOut(auth);
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <p style={styles.loading}>Loading...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {user ? (
                <div style={styles.card}>
                    {user.photoURL && (
                        <img
                            src={user.photoURL}
                            alt="Profile"
                            style={styles.avatar}
                        />
                    )}
                    <h2 style={styles.name}>{user.displayName}</h2>
                    <p style={styles.email}>{user.email}</p>

                    {/* Show auth method for debugging */}
                    <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "1rem" }}>
                        {isFlutterEnvironment ? "🔵 Flutter Auth" : "🟡 Firebase Auth"}
                    </p>

                    <button style={styles.button} onClick={handleSignOut}>
                        Sign Out
                    </button>
                </div>
            ) : (
                <div>
                    <button style={styles.button} onClick={handleSignIn}>
                        Sign in with Google 2.0 Stagging
                    </button>

                    {/* Show instructions for Flutter environment */}
                    {isFlutterEnvironment && (
                        <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "1rem", textAlign: "center" }}>
                            Running in Flutter WebView
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// Your existing styles - keeping them exactly the same
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#f9f9f9",
        padding: "1rem",
    },
    card: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: "2rem",
        borderRadius: "1rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        maxWidth: "350px",
        width: "100%",
        textAlign: "center",
    },
    avatar: {
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        marginBottom: "1rem",
    },
    name: {
        margin: "0.5rem 0",
        fontSize: "1.25rem",
        fontWeight: "600",
    },
    email: {
        margin: "0 0 1rem",
        fontSize: "0.95rem",
        color: "#666",
        wordBreak: "break-word",
    },
    button: {
        backgroundColor: "#4285F4",
        color: "#fff",
        border: "none",
        padding: "0.75rem 1.5rem",
        borderRadius: "0.5rem",
        cursor: "pointer",
        fontSize: "1rem",
        fontWeight: "500",
        transition: "background-color 0.3s ease",
    },
    loading: {
        fontSize: "1.2rem",
        color: "#555",
    },
};

// Note: React inline styles do not support ':hover' pseudo-selectors.
// For hover effects, use a CSS-in-JS library (e.g., styled-components, emotion) or a CSS/SCSS file.
// Example with CSS module or global CSS:
// .google-auth-btn:hover { background-color: #3367D6; }

// Remove the invalid hover assignment above.


//npm run build
// firebase deploy --only hosting

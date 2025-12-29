import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        // Force loading to complete after 2 seconds max
        const timeout = setTimeout(() => {
            if (mounted) {
                console.log('Auth: Timeout reached, completing load');
                setLoading(false);
            }
        }, 2000);

        // Try to get session
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (mounted) {
                    console.log('Auth: Session loaded', session ? 'with user' : 'no user');
                    setUser(session?.user ?? null);
                    setLoading(false);
                    clearTimeout(timeout);
                }
            })
            .catch((err) => {
                console.error('Auth: Error getting session', err);
                if (mounted) {
                    setLoading(false);
                    clearTimeout(timeout);
                }
            });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (mounted) {
                    console.log('Auth: State changed', event);
                    setUser(session?.user ?? null);
                    setLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    const signUp = async (email, password) => {
        setError(null);
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) { setError(error.message); throw error; }
        return data;
    };

    const signIn = async (email, password) => {
        setError(null);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setError(error.message); throw error; }
        return data;
    };

    const signOut = async () => {
        setError(null);
        const { error } = await supabase.auth.signOut();
        if (error) { setError(error.message); throw error; }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            signUp,
            signIn,
            signOut,
            isAuthenticated: !!user,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}

export default AuthContext;

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../components/Auth';

/**
 * Hook for managing saved portfolios
 */
export function usePortfolios() {
    const { user } = useAuth();
    const [portfolios, setPortfolios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch all portfolios for the user
    const fetchPortfolios = useCallback(async () => {
        if (!user) {
            setPortfolios([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from('structura_portfolios')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setPortfolios(data || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching portfolios:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Load portfolios on mount and when user changes
    useEffect(() => {
        fetchPortfolios();
    }, [fetchPortfolios]);

    // Save a new portfolio
    const savePortfolio = useCallback(async (portfolio) => {
        if (!user) throw new Error('Must be logged in to save portfolios');

        const { data, error } = await supabase
            .from('structura_portfolios')
            .insert({
                user_id: user.id,
                name: portfolio.name,
                assets: portfolio.assets,
                date_range: portfolio.dateRange,
                weights: portfolio.weights,
            })
            .select()
            .single();

        if (error) throw error;

        setPortfolios(prev => [data, ...prev]);
        return data;
    }, [user]);

    // Update an existing portfolio
    const updatePortfolio = useCallback(async (id, updates) => {
        if (!user) throw new Error('Must be logged in to update portfolios');

        const { data, error } = await supabase
            .from('structura_portfolios')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;

        setPortfolios(prev =>
            prev.map(p => p.id === id ? data : p)
        );
        return data;
    }, [user]);

    // Delete a portfolio
    const deletePortfolio = useCallback(async (id) => {
        if (!user) throw new Error('Must be logged in to delete portfolios');

        const { error } = await supabase
            .from('structura_portfolios')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        setPortfolios(prev => prev.filter(p => p.id !== id));
    }, [user]);

    return {
        portfolios,
        loading,
        error,
        fetchPortfolios,
        savePortfolio,
        updatePortfolio,
        deletePortfolio,
    };
}

export default usePortfolios;

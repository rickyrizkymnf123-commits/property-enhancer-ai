import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Database } from '../types/database.types';

export type Project = Database['public']['Tables']['projects']['Row'];

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects((data as Project[]) || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (projectData: { name: string; description?: string | null; address?: string | null }) => {
    if (!user) return { data: null, error: new Error('Not authenticated') };
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectData.name,
          description: projectData.description || null,
          address: projectData.address || null,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchProjects();
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  const updateProject = async (id: string, updates: { name?: string; description?: string | null; address?: string | null }) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchProjects();
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      await fetchProjects();
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  return {
    projects,
    isLoading,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}

export default useProjects;

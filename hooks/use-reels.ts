import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ReelService } from '@/services/reel.service';
import type { ReelWithAuthor } from '@/types/types';

/**
 * Hook for managing the Reels feed.
 * Handles vertical paging state, muting, and interactions.
 */
export function useReels() {
  const [data, setData] = useState<ReelWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const loadReels = useCallback(async () => {
    try {
      const reels = await ReelService.getFeed();
      setData(reels);
    } catch (error) {
      console.error('Failed to load reels:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReels();
    }, [loadReels])
  );

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const handleLike = useCallback(async (reelId: string) => {
    // Optimistic update
    setData(prev => prev.map(r => 
      r.id === reelId ? { ...r, isLiked: !r.isLiked, likeCount: r.isLiked ? r.likeCount - 1 : r.likeCount + 1 } : r
    ));

    try {
      await ReelService.toggleLike(reelId);
    } catch (error) {
      // Rollback
      const reel = data.find(r => r.id === reelId);
      if (reel) {
        setData(prev => prev.map(r => 
          r.id === reelId ? { ...r, isLiked: reel.isLiked, likeCount: reel.likeCount } : r
        ));
      }
    }
  }, [data]);

  return {
    data,
    isLoading,
    activeIndex,
    setActiveIndex,
    isMuted,
    toggleMute,
    handleLike,
    refresh: loadReels
  };
}

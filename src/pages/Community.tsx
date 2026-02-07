import { useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Users, MessageCircle, Heart, Share2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useFirebaseUserCached, useFirebaseApartmentsCached, useFirebaseCommunityPostsCached, useFirebaseCommunityStatsCached } from "@/hooks/useFirebaseWithCache";
import { useFirebaseActiveUsers, getUserIdFromEmail, createCommunityPost } from "@/hooks/useFirebase";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n";
import { useApartmentColor } from "@/contexts/ApartmentColorContext";

function useFormatRelativeTime() {
  const { t } = useLanguage();
  
  return (timestamp: number): string => {
    const now = Date.now();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);
    
    if (diffInSeconds < 60) return t.time.justNow;
    if (diffInSeconds < 3600) return t.time.minutesAgo.replace('{count}', String(Math.floor(diffInSeconds / 60)));
    if (diffInSeconds < 86400) return t.time.hoursAgo.replace('{count}', String(Math.floor(diffInSeconds / 3600)));
    return t.time.daysAgo.replace('{count}', String(Math.floor(diffInSeconds / 86400)));
  };
}

const POST_ICONS = ['💬', '🌅', '🏆', '🔒', '💡', '🌙', '⚡', '💚', '🎉', '✨', '🌟', '🔥'];

export default function Community() {
  const { t } = useLanguage();
  const formatRelativeTime = useFormatRelativeTime();
  const { user: authUser } = useAuth();
  const userId = getUserIdFromEmail(authUser?.email);
  const { user: firebaseUser, loading: userLoading } = useFirebaseUserCached(userId);
  const { apartments, loading: apartmentsLoading } = useFirebaseApartmentsCached();
  const { posts, loading: postsLoading } = useFirebaseCommunityPostsCached('B001');
  const { loading: statsLoading } = useFirebaseCommunityStatsCached('B001');
  const { activeUsers, loading: usersLoading } = useFirebaseActiveUsers('B001');
  const { toast } = useToast();
  const { primaryColor: apartmentColor } = useApartmentColor();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('💬');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = postsLoading || statsLoading || usersLoading || userLoading || apartmentsLoading;
  const activeUsersCount = activeUsers.length;

  const userApartmentId = firebaseUser?.primaryApartment || (firebaseUser?.apartments ? Object.keys(firebaseUser.apartments)[0] : null);
  const userApartment = userApartmentId ? apartments.find(apt => apt.apartmentId === userApartmentId) : null;
  const userApartmentName = userApartment?.name || userApartmentId || null;

  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.community.errors.emptyContent,
      });
      return;
    }

    if (!userId || !userApartmentId || !userApartmentName) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.community.errors.userInfo,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const apartmentName = userApartmentName || userApartmentId;
      
      await createCommunityPost('B001', {
        userId,
        userName: firebaseUser?.name || authUser?.name || authUser?.email?.split('@')[0] || 'Usuario',
        userAvatar: '👤',
        apartmentId: userApartmentId,
        apartmentName: apartmentName,
        content: postContent.trim(),
        icon: selectedIcon,
        type: 'post',
      });

      toast({
        title: t.community.success.created,
        description: t.community.success.createdDesc,
      });

      setPostContent('');
      setSelectedIcon('💬');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.community.errors.createFailed,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="font-display text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2 md:gap-3" >
                <Users className="w-5 h-5 md:w-7 md:h-7 shrink-0" style={{ color: apartmentColor }} />
                <span className="truncate">{t.community.title}</span>
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">
                {t.community.subtitle}
              </p>
            </div>
            <Badge variant="secondary" className="gap-1 shrink-0 text-[10px] md:text-xs">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse" />
              {isLoading ? (
                <Loader2 className="w-2.5 h-2.5 md:w-3 md:h-3 animate-spin" />
              ) : (
                `${activeUsersCount} ${t.community.activeUsers}`
              )}
            </Badge>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 md:mb-6"
        >
          <Button 
            className="w-full gap-2 h-10 md:h-11 text-sm md:text-base text-white"
            style={{ backgroundColor: apartmentColor }}
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={!userId || !userApartmentId}
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            {t.community.newPost}
          </Button>
        </motion.div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 md:py-20">
            <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-primary mb-4" />
            <p className="text-sm md:text-base text-muted-foreground">{t.common.loading}</p>
          </div>
        )}

        {!isLoading && (
          <div className="space-y-3 md:space-y-4">
            {posts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6 md:p-8 text-center"
              >
                <Users className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm md:text-base text-muted-foreground">
                  {t.community.noPosts}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mt-2">
                  {t.community.beFirst}
                </p>
              </motion.div>
            ) : (
              posts.map((post, index) => {
                const isLiked = userId ? post.likes?.[userId] || false : false;
                
                return (
                  <motion.div
                    key={post.postId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * (index + 1) }}
                    className="glass-panel p-3 md:p-4"
                  >
                    <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-3">
                      <Avatar className="h-8 w-8 md:h-10 md:w-10">
                        <AvatarFallback className="bg-primary/20 text-sm md:text-lg">
                          {post.userAvatar || post.userName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                          <span className="font-medium text-sm md:text-base truncate">{post.userName}</span>
                          <Badge variant="outline" className="text-[9px] md:text-[10px] px-1 md:px-1.5 shrink-0">
                            {post.apartmentName}
                          </Badge>
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          {formatRelativeTime(post.timestamp)}
                        </p>
                      </div>
                      <span className="text-base md:text-xl shrink-0">{post.icon}</span>
                    </div>

                    <p className="text-xs md:text-sm mb-3 md:mb-4 leading-relaxed">{post.content}</p>

                    <div className="flex items-center gap-3 md:gap-4 pt-2 md:pt-3 border-t border-border/50">
                      <button className="flex items-center gap-1 md:gap-1.5 text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors touch-manipulation">
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-primary text-primary' : ''}`} />
                        <span>{post.likesCount || 0}</span>
                      </button>
                      <button className="flex items-center gap-1 md:gap-1.5 text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors touch-manipulation">
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.commentsCount || 0}</span>
                      </button>
                      <button className="flex items-center gap-1 md:gap-1.5 text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors ml-auto touch-manipulation">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t.community.createPost.title}</DialogTitle>
              <DialogDescription>
                {t.community.createPost.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t.community.createPost.icon}</Label>
                <div className="flex flex-wrap gap-2">
                  {POST_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setSelectedIcon(icon)}
                      className={`w-10 h-10 rounded-lg border-2 text-xl transition-all ${
                        selectedIcon === icon
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="post-content">{t.community.createPost.content}</Label>
                <Textarea
                  id="post-content"
                  placeholder={t.community.createPost.placeholder}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="min-h-[120px] resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {postContent.length}/500
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setPostContent('');
                  setSelectedIcon('💬');
                }}
                disabled={isSubmitting}
              >
                {t.common.cancel}
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={isSubmitting || !postContent.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.community.createPost.publishing}
                  </>
                ) : (
                  t.community.createPost.publish
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

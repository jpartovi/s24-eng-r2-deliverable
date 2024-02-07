"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { format } from 'date-fns';
import { useRouter } from "next/navigation";
import { CommentsWithNames } from "./page";

type CommentWithName = CommentsWithNames[number];

export default async function CommentCard({ comment, userId }: {
  comment: CommentWithName;
  userId: string;
}) {

  const router = useRouter();

  // // Format comment time stamp
  const time = new Date(comment.created_at);
  const formattedTime = format(time, "h:mma, M/d").toLowerCase();

  // // Handles comment deletion: removes comment from Supabase and refreshes route
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', comment.id)

    // Catch and report errors from Supabase and exit the onSaveChanges function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Refresh all server components in the current route.
    router.refresh();

    return toast({
      title: "Comment Deleted",
      description: "Successfully deleted \"" + (comment.content.slice(0, 25).trim() + (comment.content.length > 25 ? "..." : "")) + "\""
    });
  }

  return (
    <div className="mx-6 mb-2 w-full min-w-72 flex-none rounded-lg border-2 p-3 shadow">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h4 className="text-lg font-medium">{comment.profiles?.display_name}</h4>
        {userId == comment.author && (
          <Button variant="destructive" className="h-7 px-3" onClick={handleDelete}>Delete</Button>
        )}
      </div>
      <h4 className="text-sm font-light">{formattedTime}</h4>
      <p className="mt-2">{comment.content}</p>
    </div>
  );
}

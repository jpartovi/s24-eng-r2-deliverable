import { Separator } from "@/components/ui/separator";
import { TypographyH2 } from "@/components/ui/typography";
import type { Database } from "@/lib/schema";
import { createServerSupabaseClient } from "@/lib/server-utils";
import type { QueryData } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import AddSpeciesDialog from "./add-species-dialog";
import SpeciesCard from "./species-card";


export type Comment = Database["public"]["Tables"]["comments"]["Row"];

const supabase = createServerSupabaseClient();
const commentsWithNamesQuery = supabase.from("comments").select(`
    id,
    created_at,
    content,
    author,
    species,
    profiles ( id, display_name )
  `).order("created_at", { ascending: false });

  export type CommentsWithNames = QueryData<typeof commentsWithNamesQuery>

export default async function SpeciesList() {
  // Create supabase server component client and obtain user session from stored cookie
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // this is a protected route - only users who are signed in can view this route
    redirect("/");
  }

  // Obtain the ID of the currently signed-in user
  const sessionId = session.user.id;

  // Load data from 'species', 'comments' and 'profiles' tables in Supabase
  const { data: species } = await supabase.from("species").select("*").order("id", { ascending: false });
  const { data } = await commentsWithNamesQuery;
  const commentsWithNames = data;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <TypographyH2>Species List</TypographyH2>
        <AddSpeciesDialog userId={sessionId} />
      </div>
      <Separator className="my-4" />
      <div className="flex flex-wrap justify-center">
        {
        // For each species, create a species card and pass in props (including species comments)
        species?.map((species) => <SpeciesCard
          key={species.id}
          species={species}
          comments={
            //comments?.filter((comment) => comment.species == species.id).map((filteredComment) => filteredComment) ?? []
            commentsWithNames?.filter((comment) => comment.species == species.id).map((filteredComment) => filteredComment) ?? []
          }
          userId={sessionId} />)}
      </div>
    </>
  );
}
//profiles?.filter((profile) => profile.id == filteredComment.author)

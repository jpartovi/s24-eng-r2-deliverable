import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { numberWithCommas } from "../formatting";
import { kingdoms, speciesSchema } from "./add-species-dialog";
import type { SpeciesFormData } from "./add-species-dialog";
import CommentCard from "./comment-card";
import type { CommentsWithNames } from "./page";
import type { Species } from "./species-card";

// Use Zod to define the shape + requirements of a Comment entry; used in form validation
const commentFormSchema = z.object({
  content: z
    .string()
    .min(1, {
      message: "Comment must be at least 1 character.",
    })
    .max(150, {
      message: "Comment must not be longer than 150 characters.",
    })
    .refine((value) => value.trim() !== '', {
      message: 'String cannot be empty or contain only whitespace',
    })
    .transform((val) => val.trim())
});

export default function SpeciesDetailsDialog({ species, comments, userId }: {
  species: Species;
  comments: CommentsWithNames;
  userId: string;
}) {

  // Control editing state of the dialog
  const [isEditing, setIsEditing] = useState(false);

  // Flips editing status of the dialog
  const flipEditing = () => {
    setIsEditing(!isEditing);
  };

  // Control open/closed state of the dialog
  const [open, setOpen] = useState<boolean>(false);

  const router = useRouter();

  const supabase = createBrowserSupabaseClient();

  // Default values for the species form fields.
  const speciesDefaultValues: Partial<SpeciesFormData> = {
    scientific_name: species.scientific_name,
    common_name: species.common_name,
    kingdom: species.kingdom,
    total_population: species.total_population,
    image: species.image,
    description: species.description,
  };


  // Instantiate species form functionality with React Hook Form, passing in the Zod schema (for validation) and default values.
  const speciesForm = useForm<SpeciesFormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues: speciesDefaultValues,
    mode: "onChange",
  });

  // Handles the "Save Changes" button: updates the species information in Supabase and returns to non-editing mode
  const onSaveChanges = async (input: SpeciesFormData) => {

    // Update the current species with Supabase query.
    //const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("species").update(input).eq("id", species.id);

    // Catch and report errors from Supabase and exit the onSaveChanges function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsEditing(false)

    // Reset form values.
    speciesForm.reset(input);

    //setOpen(false);

    // Refresh all server components in the current route.
    router.refresh();

    return toast({
      title: "Species Details Edited!",
      description: "Successfully edited " + input.scientific_name + ".",
    });
  };

  // Ensure that when the dialog is opened, editing mode is always off
  const handleOpenChange = (open : boolean) => {
    setIsEditing(false);
    setOpen(open);
  };

  // Handles cancel button with a confirmation modal
  const handleCancel = () => {
    if (!window.confirm("All changes will be discarded.")) {
      return;
    }
    flipEditing();
  }

  // Handles delete button with a confirmation modal and deletes the current species from Supabase
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this species?")) {
      return;
    }
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from('species')
      .delete()
      .eq('id', species.id)

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

    setOpen(false);

    return toast({
      title: "Species Deleted",
      description: "Successfully deleted " + species.scientific_name + ".",
    });
  }

  type CommentFormData = z.infer<typeof commentFormSchema>;

  // Default values for the comment form field.
  const commentDefaultValues: Partial<CommentFormData> = {
    content: ""
  };

  // Instantiate form functionality with React Hook Form, passing in the Zod schema (for validation) and default values
  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: commentDefaultValues,
    mode: "onChange",
  });

  const onPost = async (input: CommentFormData) => {
    // Instantiate Supabase client (for client components) and make update based on input data
    //const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("comments").insert([
      {
        author: userId,
        content: input.content,
        species: species.id
      },
    ]);

    // Catch and report errors from Supabase and exit the onSubmit function with an early 'return' if an error occurred.
    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Because Supabase errors were caught above, the remainder of the function will only execute upon a successful edit

    commentForm.reset(commentDefaultValues);

    // Router.refresh does not affect CommentForm because it is a client component, but it will refresh the initials in the user-nav in the event of a username change
    router.refresh();

    return toast({
      title: "Comment Posted!",
      description: "Successfully commented \"" + (input.content.slice(0, 25).trim() + (input.content.length > 25 ? "..." : "")) + "\""
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="mt-3 w-full">Learn More</Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        {isEditing ? (
          <div>
            <DialogHeader>
            <DialogTitle>Edit Species</DialogTitle>
            <DialogDescription>
              Click &quot;Save Changes&quot; below when you&apos;re done.
            </DialogDescription>
            </DialogHeader>
              <Form {...speciesForm}>
                <form onSubmit={(e: BaseSyntheticEvent) => void speciesForm.handleSubmit(onSaveChanges)(e)}>
                  <div className="grid w-full items-center gap-4">
                    <FormField
                      control={speciesForm.control}
                      name="scientific_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scientific Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Cavia porcellus" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={speciesForm.control}
                      name="common_name"
                      render={({ field }) => {
                        // We must extract value from field and convert a potential defaultValue of `null` to "" because inputs can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                        const { value, ...rest } = field;
                        return (
                          <FormItem>
                            <FormLabel>Common Name</FormLabel>
                            <FormControl>
                              <Input value={value ?? ""} defaultValue={species.common_name ? species.common_name : ""} {...rest} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={speciesForm.control}
                      name="kingdom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kingdom</FormLabel>
                          <Select onValueChange={(value) => field.onChange(kingdoms.parse(value))} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a kingdom" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectGroup>
                                {kingdoms.options.map((kingdom, index) => (
                                  <SelectItem key={index} value={kingdom}>
                                    {kingdom}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={speciesForm.control}
                      name="total_population"
                      render={({ field }) => {
                        const { value, ...rest } = field;
                        return (
                          <FormItem>
                            <FormLabel>Total population</FormLabel>
                            <FormControl>
                              {/* Using shadcn/ui form with number: https://github.com/shadcn-ui/ui/issues/421 */}
                              <Input
                                type="number"
                                value={value ?? ""}
                                placeholder="300000"
                                {...rest}
                                onChange={(event) => field.onChange(+event.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={speciesForm.control}
                      name="image"
                      render={({ field }) => {
                        // We must extract value from field and convert a potential defaultValue of `null` to "" because inputs can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                        const { value, ...rest } = field;
                        return (
                          <FormItem>
                            <FormLabel>Image URL</FormLabel>
                            <FormControl>
                              <Input
                                value={value ?? ""}
                                placeholder="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/George_the_amazing_guinea_pig.jpg/440px-George_the_amazing_guinea_pig.jpg"
                                {...rest}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={speciesForm.control}
                      name="description"
                      render={({ field }) => {
                        // We must extract value from field and convert a potential defaultValue of `null` to "" because textareas can't handle null values: https://github.com/orgs/react-hook-form/discussions/4091
                        const { value, ...rest } = field;
                        return (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                value={value ?? ""}
                                placeholder="The guinea pig or domestic guinea pig, also known as the cavy or domestic cavy, is a species of rodent belonging to the genus Cavia in the family Caviidae."
                                {...rest}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <div className="flex">
                      <Button type="submit" className="mr-1 flex-auto">
                        Save Changes
                      </Button>
                      <Button type="button" className="ml-1 flex-auto" variant="secondary" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </div>
                    <Button className="w-full" variant="destructive" onClick={
                      () => {
                        void handleDelete();
                      }
                    }>Delete Species</Button>
                  </div>
                </form>
              </Form>
          </div>
        ) : (
          <div>
            <DialogHeader>
              <DialogTitle>{species.scientific_name}</DialogTitle>
              {species.common_name && <DialogDescription>{species.common_name}</DialogDescription>}
            </DialogHeader>
            {species.image && (
              <div className="relative mt-3 h-80 w-full">
                <Image src={species.image} alt={species.scientific_name} fill style={{ objectFit: "cover" }} />
              </div>
            )}
            <h4 className="mt-3 text-lg font-medium">
              Kingdom: {species.kingdom} {species.total_population ? ", Total Population: " + numberWithCommas(species.total_population): ""}
            </h4>
            <p>{species.description ? species.description : ""}</p>
            {userId == species.author && <Button className="mt-3 w-full" onClick={flipEditing}>Edit Species</Button>}
            <Form {...commentForm}>
              <form onSubmit={(e: BaseSyntheticEvent) => void commentForm.handleSubmit(onPost)(e)} className="space-y-8">
                <FormField
                  control={commentForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        {/* Set inputs to readOnly (boolean prop) depending on toggleable value of isEditing */}
                        <div className="flex mt-3 gap-3">
                          <Input placeholder="Leave a comment!" {...field} />
                          <Button>Post</Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            {comments.length != 0 && <div className="m-4 flex flex-wrap justify-center">
              {comments?.map((comment) => <CommentCard key={comment.id} comment={comment} userId={userId}/>)}
            </div>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

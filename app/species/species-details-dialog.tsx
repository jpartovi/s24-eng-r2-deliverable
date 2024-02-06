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
import type { Database } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { numberWithCommas } from "../formatting";
import Image from "next/image";

type Species = Database["public"]["Tables"]["species"]["Row"];

// We use zod (z) to define a schema for the "Add species" form.
// zod handles validation of the input values with methods like .string(), .nullable(). It also processes the form inputs with .transform() before the inputs are sent to the database.

// Define kingdom enum for use in Zod schema and displaying dropdown options in the form
const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

// Use Zod to define the shape + requirements of a Species entry; used in form validation
const speciesSchema = z.object({
  scientific_name: z
    .string()
    .trim()
    .min(1)
    .transform((val) => val?.trim()),
  common_name: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  kingdom: kingdoms,
  total_population: z.number().int().positive().min(1).nullable(),
  image: z
    .string()
    .url()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
  description: z
    .string()
    .nullable()
    // Transform empty string or only whitespace input to null before form submission, and trim whitespace otherwise
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
});

type FormData = z.infer<typeof speciesSchema>;

export default function SpeciesDetailsDialog({ species, userId }: {
  species: Species;
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

  // Default values for the form fields.
  const defaultValues: Partial<FormData> = {
    scientific_name: species.scientific_name,
    common_name: species.common_name,
    kingdom: species.kingdom,
    total_population: species.total_population,
    image: species.image,
    description: species.description,
  };


  // Instantiate form functionality with React Hook Form, passing in the Zod schema (for validation) and default values.
  const form = useForm<FormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues,
    mode: "onChange",
  });

  const onSaveChanges = async (input: FormData) => {

    // Update the current species with Supabase query.
    const supabase = createBrowserSupabaseClient();
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
    form.reset(input);

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
              <Form {...form}>
                <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSaveChanges)(e)}>
                  <div className="grid w-full items-center gap-4">
                    <FormField
                      control={form.control}
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
                      control={form.control}
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
                      control={form.control}
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
                      control={form.control}
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
                      control={form.control}
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
                      control={form.control}
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
                    <Button className="w-full" variant="destructive" onClick={handleDelete}>Delete Species</Button>
                  </div>
                </form>
              </Form>
          </div>
        ) : (
          // TODO: Edit placeholders
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
              {/* TODO: format this nicer*/}
              Kingdom: {species.kingdom} {species.total_population ? ", Total Population: " + numberWithCommas(species.total_population): ""}
            </h4>
            <p>{species.description ? species.description : ""}</p>
            <Button className="mt-3 w-full" onClick={flipEditing}>Edit Species</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

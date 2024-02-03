import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Database } from "@/lib/schema";
import { numberWithCommas } from "../formatting";

type Species = Database["public"]["Tables"]["species"]["Row"];

export default function SpeciesDetailsDialog({ species }: { species: Species }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="mt-3 w-full">Learn More</Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{species.scientific_name}</DialogTitle>
          {species.common_name && <DialogDescription>{species.common_name}</DialogDescription>}
        </DialogHeader>
        {/*
          TODO: add this image (its wrong sizing right now)
          {species.image && (
            <div className="relative h-40 w-full">
              <Image src={species.image} alt={species.scientific_name} fill style={{ objectFit: "cover" }} />
            </div>
          )}
        */}
        <p>
          {/* TODO: format this nicer nicer (centered dots maybe?)*/}
          Kingdom: {species.kingdom ? species.kingdom : "not available"}, Total Population:{" "}
          {species.total_population ? numberWithCommas(species.total_population) : "not available"}
        </p>
        <p>{species.description ? species.description : ""}</p>
      </DialogContent>
    </Dialog>
  );
}

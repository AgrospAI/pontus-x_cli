import { search } from "@inquirer/prompts";
import { getKnownAddresses, type Publisher } from "@/lib/aquarius";

export async function PromptForPublishers(): Promise<Publisher[]> {
  const knownAddresses = await getKnownAddresses();

  const publishers = [];

  while (true) {
    const publisher = await search({
      message:
        "Search for a publisher by name or address (leave empty to finish):",
      pageSize: 10,
      source: async (input) => {
        if (!input) {
          return [{ name: "Finish selection", value: null }];
        }

        const choices = [];

        for (const [address, name] of Object.entries(knownAddresses)) {
          if (
            name.toLowerCase().includes(input.toLowerCase()) ||
            address.toLowerCase().includes(input.toLowerCase())
          ) {
            choices.push({
              name: `${name} (${address})`,
              value: { name, address },
            });
          }
        }

        const userChoice = {
          name: input,
          value: { name: "", address: input },
        };

        return [...choices, userChoice];
      },
    });
    if (!publisher || !publisher.address) {
      break;
    }
    publishers.push(publisher);
  }

  return publishers;
}

import { expectTypeOf, it } from "vitest";
import type { FrameTransport, Row } from "../src/types";

type Receipt = { record: { id: string }; receipt: string };
const createRow = (transport: FrameTransport) =>
  transport.create("articles", {});
const createReceipt = (transport: FrameTransport) =>
  transport.create<Receipt>("receipts", {});
const updateRow = (transport: FrameTransport) =>
  transport.save("articles", "1", {});
function invalidUpdate(transport: FrameTransport) {
  // @ts-expect-error Creation has its own method; save requires a record ID.
  transport.save("articles", null, {});
}
void invalidUpdate;

it("keeps ordinary rows and declared creation results distinct", () => {
  expectTypeOf<ReturnType<typeof createRow>>().toEqualTypeOf<Promise<Row>>();
  expectTypeOf<ReturnType<typeof createReceipt>>().toEqualTypeOf<
    Promise<Receipt>
  >();
  expectTypeOf<ReturnType<typeof updateRow>>().toEqualTypeOf<Promise<Row>>();
});

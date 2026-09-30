import assert from "node:assert/strict";
import { test } from "node:test";
import { fileNameForDataUrl } from "../src/lib/media";
import { eventImageAttachments } from "../src/lib/types";

test("nome do arquivo ganha extensão pela data URL", () => {
  assert.equal(fileNameForDataUrl("salao", "data:image/jpeg;base64,xx"), "salao.jpg");
  assert.equal(fileNameForDataUrl("nota.pdf", "data:application/pdf;base64,xx"), "nota.pdf");
});

test("só as imagens anexadas entram no PDF do relatório", () => {
  const images = eventImageAttachments([
    { id: "1", name: "foto.jpg", mime: "image/jpeg", size: 10, dataUrl: "data:image/jpeg;base64,xx" },
    { id: "2", name: "clip.mp4", mime: "video/mp4", size: 10, dataUrl: "data:video/mp4;base64,xx" },
  ]);
  assert.deepEqual(images.map((item) => item.id), ["1"]);
});

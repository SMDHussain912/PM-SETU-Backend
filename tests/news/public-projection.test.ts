import assert from "node:assert/strict";
import test from "node:test";
import { toPublicNews, toPublicNewsAttachment } from "../../src/modules/news/news.public";
import type { News, NewsAttachment } from "../../src/modules/news/news.types";

test("public news attachment projection omits internal storage path", () => {
    const attachment = {
        id: 8,
        file_path: "/srv/pm-setu/uploads/news/private-attachment.pdf",
        file_name: "notice.pdf",
        mime_type: "application/pdf",
        file_size: 1024,
        created_at: null,
    } as NewsAttachment;

    const result = toPublicNewsAttachment(attachment);

    assert.equal("file_path" in result, false);
    assert.equal(result.file_name, "notice.pdf");
});

test("public news detail redacts paths from nested attachments", () => {
    const news = {
        id: 4,
        title: "Public notice",
        attachments: [{
            id: 8,
            file_path: "/srv/pm-setu/uploads/news/private-attachment.pdf",
            file_name: "notice.pdf",
            mime_type: "application/pdf",
            file_size: 1024,
            created_at: null,
        }],
    } as News;

    const result = toPublicNews(news);

    assert.equal(result.title, "Public notice");
    assert.equal("file_path" in result.attachments![0], false);
});

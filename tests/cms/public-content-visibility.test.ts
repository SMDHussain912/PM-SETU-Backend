import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../../src/config/database";
import * as newsRepository from "../../src/modules/news/news.repository";
import * as documentRepository from "../../src/modules/documents/document.repository";
import * as galleryRepository from "../../src/modules/gallery/gallery.repository";
import * as searchRepository from "../../src/modules/search/search.repository";

test("public CMS queries exclude unpublished news, documents and gallery items", async () => {
    const client = prisma as unknown as { $queryRaw: (query: { sql?: string }) => Promise<unknown[]> };
    const original = client.$queryRaw;
    const statements: string[] = [];

    client.$queryRaw = async (query) => {
        statements.push(query.sql ?? "");
        return [];
    };

    try {
        await newsRepository.listNews({ page: 1, pageSize: 10 });
        await newsRepository.countNews();
        await newsRepository.getNewsById(101);
        await newsRepository.getLatestNews(5);

        await documentRepository.listDocuments({ page: 1, pageSize: 10 });
        await documentRepository.countDocuments({ page: 1, pageSize: 10 });
        await documentRepository.getPublishedDocumentById(202);

        await galleryRepository.listGalleryItems({ page: 1, pageSize: 10 });
        await galleryRepository.countGalleryItems();
        await galleryRepository.getPublishedGalleryItemById(303);
        await galleryRepository.listGalleryPhotos({ page: 1, pageSize: 10 });
        await galleryRepository.countGalleryPhotos();
        await galleryRepository.listGalleryVideos({ page: 1, pageSize: 10 });
        await galleryRepository.countGalleryVideos();

        await searchRepository.search({ q: "PM SETU", page: 1, pageSize: 10 });
        await searchRepository.countSearchResults({ q: "PM SETU", page: 1, pageSize: 10 });

        const sql = statements.join("\n");
        assert.match(sql, /news\.is_published = TRUE/);
        assert.match(sql, /documents\.publish_status = 'PUBLISHED'/);
        assert.match(sql, /gallery_items\.is_published = TRUE/);
    } finally {
        client.$queryRaw = original;
    }
});

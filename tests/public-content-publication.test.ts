import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../src/config/database";
import * as bannerRepository from "../src/modules/banners/banner.repository";
import * as documentRepository from "../src/modules/documents/document.repository";
import * as galleryRepository from "../src/modules/gallery/gallery.repository";
import * as newsRepository from "../src/modules/news/news.repository";

test("public CMS reads only return published content", async () => {
    const client = prisma as unknown as {
        $queryRaw: (query: { sql?: string }) => Promise<unknown[]>;
    };
    const original = client.$queryRaw;
    const statements: string[] = [];

    client.$queryRaw = async (query) => {
        statements.push(query.sql ?? "");
        return [];
    };

    try {
        const pagination = { page: 1, pageSize: 10 };
        await galleryRepository.listGalleryItems(pagination);
        await galleryRepository.listGalleryPhotos(pagination);
        await galleryRepository.listGalleryVideos(pagination);
        await galleryRepository.getPublishedGalleryItemById(1);

        await bannerRepository.listBanners(pagination);
        await bannerRepository.listActiveBanners(pagination);

        await newsRepository.listNews(pagination);
        await newsRepository.getNewsById(1);
        await newsRepository.getLatestNews(5);

        await documentRepository.listDocuments(pagination);
        await documentRepository.getPublishedDocumentById(1);
    } finally {
        client.$queryRaw = original;
    }

    assert.equal(statements.length, 11);

    for (const statement of statements.slice(0, 4)) {
        assert.match(statement, /is_published = TRUE/i, "public gallery queries must exclude unpublished items");
    }
    assert.match(statements[1], /type = 'PHOTO'/i);
    assert.match(statements[2], /type = 'VIDEO'/i);

    for (const statement of statements.slice(4, 6)) {
        assert.match(statement, /is_published = TRUE/i, "public banner queries must exclude unpublished banners");
        assert.match(statement, /is_archived = FALSE/i, "public banner queries must exclude archived banners");
    }
    assert.match(statements[5], /start_date IS NULL OR banners\.start_date <= now\(\)/i);
    assert.match(statements[5], /end_date IS NULL OR banners\.end_date >= now\(\)/i);

    for (const statement of statements.slice(6, 9)) {
        assert.match(statement, /news\.is_published = TRUE/i, "public news queries must exclude unpublished items");
    }

    for (const statement of statements.slice(9, 11)) {
        assert.match(statement, /publish_status = 'PUBLISHED'/i, "public document queries must exclude non-published records");
    }
});

import { detransliterate } from './ParsersAndFormatters';
import tt from 'counterpart';

export const TAGS_LIMIT = 5;
export const TAGS_MAX_LENGTH = 24;
export const NSFW_TAG = 'nsfw';
export const NSFW_TAG_NUMERIC = '18+';

const FAVORITE_KEY = 'golos.favorite-tags';

export function filterRealTags(tags) {
    return tags.filter(tag => tag !== NSFW_TAG_NUMERIC && tag !== NSFW_TAG);
}

export function validateTags(tags, finalCheck) {
    const realTags = filterRealTags(tags);

    if (finalCheck && realTags.length === 0) {
        return tt('category_selector_jsx.must_set_category');
    }

    if (realTags.length > TAGS_LIMIT) {
        return tt('category_selector_jsx.use_limitied_amount_of_categories', {
            amount: TAGS_LIMIT,
        });
    }

    for (let tag of realTags) {
        const error = validateTag(tag);

        if (error) {
            return error;
        }
    }
}

export function validateTag(tag) {
    if (tag === NSFW_TAG_NUMERIC) {
        return null;
    }

    if (tag.length > TAGS_MAX_LENGTH) {
        return tt('category_selector_jsx.maximum_tag_length_is_24_characters');
    }
    if (tag.split('-').length > 2) {
        return tt('category_selector_jsx.use_one_dash');
    }
    if (tag.includes(',')) {
        return tt('category_selector_jsx.use_spaces_to_separate_tags');
    }
    if (tag.toLowerCase() !== tag) {
        return tt('category_selector_jsx.use_only_lowercase_letters');
    }
    if (!/^[a-zа-яё0-9-ґєії]+$/.test(tag)) {
        return tt('category_selector_jsx.use_only_allowed_characters');
    }
    if (!/^[a-zа-яё-ґєії]/.test(tag)) {
        return tt('category_selector_jsx.must_start_with_a_letter');
    }
    if (!/[a-zа-яё0-9ґєії]$/.test(tag)) {
        return tt('category_selector_jsx.must_end_with_a_letter_or_number');
    }
    if (tag === 'stihi-io') {
        return tt('category_selector_jsx.denied_to_publish_the_posts_with_tag');
    }
    return null;
}

export function processTagsToSend(tags) {
    return tags.map(
        item =>
            /^[а-яё]/.test(item) ? 'ru--' + detransliterate(item, true) : item
    );
}

function loadFavoriteTags() {
    try {
        const tagsJson = localStorage.getItem(FAVORITE_KEY);

        if (tagsJson) {
            return JSON.parse(tagsJson);
        }
    } catch (err) {
        console.error(err);
    }
}

export function getFavoriteTags() {
    const tags = loadFavoriteTags();

    if (tags) {
        return tags.slice(0, 5).map(tagInfo => tagInfo[0]);
    } else {
        return [];
    }
}

export function updateFavoriteTags(tags) {
    try {
        const savedTags = loadFavoriteTags() || [];

        const tagsSet = new Set(tags);

        for (let tag of savedTags) {
            if (tagsSet.has(tag[0])) {
                tag[1]++;
                tagsSet.delete(tag[0]);
            }
        }

        for (let tag of tagsSet) {
            savedTags.push([tag, 1]);
        }

        savedTags.sort((a, b) => b[1] - a[1]);

        localStorage.setItem(FAVORITE_KEY, JSON.stringify(savedTags));
    } catch (err) {
        console.error(err);
    }
}

if (process.env.BROWSER) {
    window.updateFavoriteTags = updateFavoriteTags;
}

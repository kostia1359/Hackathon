import { callApi } from '../helpers/apiHelper';

const cherio = require('cherio');

const AUCHAN = 'https://stores-api.zakaz.ua/stores/48246401/products/search/?q=';
const EPICENTR = 'https://epicentrk.ua/search/?q=';
const FOZZYSHOP = 'https://fozzyshop.ua/ru/search?controller=search&s=';
const epicentrName = 'epicentrk.ua';
const auchanName = 'auchan.zakaz.ua';
const fozzyshopName = 'fozzyshop.ua';

export const parserService = {
    async getDataFromSites(searchQuery) {
        const cleanQuery = cleanString(searchQuery);
        return Promise.all([
            this.getEpicentrItems(cleanQuery),
            this.getAuchanItems(cleanQuery),
            this.getFozzyshopItems(cleanQuery),
        ])
            .then((results) => {
                return results.flat();
            })
            .catch((err) => console.log(err));
    },

    async getTaggedDataFromSites(searchQuery, callback) {
        const epicentrkData = await parserService.getEpicentrItems(searchQuery);
        const auchanData = await parserService.getAuchanItems(searchQuery);
        const fozzyData = await parserService.getFozzyshopItems(searchQuery);

        const dataFromSites = {
            auchanPrice: auchanData,
            epicentrPrice: epicentrkData,
            fozzyPrice: fozzyData,
        };

        callback(dataFromSites);
    },

    async getEpicentrItems(searchQuery) {
        try {
            const pageContent = await callApi(EPICENTR + searchQuery);
            const $ = cherio.load(pageContent);
            const cardWrapper = $('#bottom-sticky .card-wrapper');
            let items = [];

            if (!$(cardWrapper).length) {
                return items;
            }

            $(cardWrapper).each((i, item) => {
                const card = $(item).children().children();
                const image = $(card).find('.card__photo img').attr('src');
                const name = $(card).find('.card__name .custom-link .nc').text();
                const url = $(card).find('.card__name .custom-link').attr('href');
                const price = $(card).find('.card__price .card__price-row .card__price-actual').children().text();
                const weight = $(card).find('.card__characteristics li').first().next().text();

                const newItem = {
                    name: cleanString(name),
                    image,
                    price: getNumberFromString(price),
                    weight: convertToKg(getNumberFromString(weight)),
                    url: 'https://epicentrk.ua/' + url,
                    site: epicentrName,
                };

                items = [...items, newItem];
            });

            return items;
        } catch (error) {
            console.log(error.message);
            return [];
        }
    },

    async getAuchanItems(searchQuery) {
        try {
            const data = await callApi(AUCHAN + searchQuery);
            return data.results.reduce((prices, item) => {
                const newItem = {
                    name: item.title,
                    price: item.price / 100,
                    image: item.img.s150x150,
                    weight: item.unit === 'kg' ? item.bundle : Math.round(item.weight / 100) / 10,
                    url: item.web_url,
                    site: auchanName,
                };

                return [...prices, newItem];
            }, []);
        } catch (error) {
            console.log(error.message);
            return [];
        }
    },

    async getFozzyshopItems(searchQuery) {
        try {
            const pageContent = await callApi(FOZZYSHOP + searchQuery);
            const $ = cherio.load(pageContent.rendered_products);
            const cardWrapper = $('.products .js-product-miniature-wrapper');
            return pageContent.products.reduce((prices, item, index) => {
                const htmlItem = $(cardWrapper).get(index);
                const htmlWeight = $(htmlItem).find('.product-reference a').first().text();
                const url = $(htmlItem).find('.product-title a').attr('href');
                const newItem = {
                    name: item.name,
                    price: item.price_amount,
                    image: item.cover.small.url,
                    weight: getWeightFromDiffValues(htmlWeight),
                    url,
                    site: fozzyshopName,
                };

                return [...prices, newItem];
            }, []);
        } catch (error) {
            console.log(error.message);
            return [];
        }
    },
};

const getWeightFromDiffValues = (value) => {
    const isKg = value.includes('кг');
    const haveParts = value.includes('*');

    if (haveParts) {
        const parts = value.split('*');
        const grValue = parts.reduce((res, part) => {
            const numValue = getNumberFromString(part);
            return res * numValue;
        }, 1);
        return convertToKg(grValue);
    }

    const parsedNumber = getNumberFromString(value);
    if (isKg) {
        return parsedNumber;
    }

    return convertToKg(parsedNumber);
};

const getNumberFromString = (string) => {
    const parts = string.match(/\d+/g);

    if (!parts) {
        return undefined;
    }

    if (parts.length > 1) {
        return Number(parts.join('.'));
    }

    return Number(parts[0]);
};

const cleanString = (string) => {
    return string ? string.replace('\\n', '').trim() : '';
};

const convertToKg = (grValue) => grValue / 1000;

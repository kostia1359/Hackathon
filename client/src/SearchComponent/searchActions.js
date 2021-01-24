import { setProducts, setProductsToShow } from '../ProductCardsWrapper/productCardActions';

export const SEARCH_ACTION = 'SEARCH_ACTION';

export function searchAction(query) {
    return (dispatch) => {
        const url = new URL('http://localhost:5000/products');
        const params = { search: query };
        url.search = new URLSearchParams(params).toString();

        fetch(url).then(async (response) => {
            if (response.ok) {
                const { value } = await response.json();

                dispatch(setProducts(value));
                dispatch(setProductsToShow(value));
            } else {
                debugger;
            }
        });
    };
}

import { takeLatest, takeEvery } from 'redux-saga';
import { call, put, select } from 'redux-saga/effects';
import { fromJS, Map, Iterable } from 'immutable'
import big from "bignumber.js";
import AssetsReducer from './AssetsReducer';
import transaction from 'app/redux/Transaction';
import utils from 'app/utils/Assets/utils';
import { api } from 'golos-js';

export const assetsWatches = [
    watchLocationChange,
    watchFetchIssuerAssets,
    watchGetAsset,
    watchCreateAsset,
    watchUpdateAsset
];

export function* watchLocationChange() {
    yield* takeLatest('@@router/LOCATION_CHANGE', fetchData);
}

export function* watchFetchIssuerAssets() {
    yield* takeLatest('FETCH_ISSUER_ASSETS', getAssetsByIssuer);
}

export function* watchGetAsset() {
    yield* takeEvery('GET_ASSET', getAsset);
}

export function* watchCreateAsset() {
    yield* takeLatest('CREATE_ASSET', createAsset);
}

export function* watchUpdateAsset() {
    yield* takeLatest('UPDATE_ASSET', updateAsset);
}

export function* fetchData(location_change_action) {
    const {pathname} = location_change_action.payload;

    if (pathname && pathname.indexOf('/assets') == -1) {
        return
    }

    yield call(getCoreAsset);
    yield put({type: 'FETCH_ISSUER_ASSETS'});
}

export function* getCoreAsset() {
    let coreAsset = yield call([api, api.getAssetsAsync], ['GOLOS']);
    coreAsset = fromJS(coreAsset[0]);
    yield put(AssetsReducer.actions.receiveCoreAsset(coreAsset));
}

export function* getAssetsByIssuer() {
    const username = yield select(state => state.user.getIn(['current', 'username']));
    let assets  = yield call([api, api.getAssetsByIssuerAsync], username);

    let assetsByIssuer = Map(assets.map( (asset) => [asset.asset_name, fromJS(asset)] ));

    const assetSymbols = assetsByIssuer.keySeq().toArray();

    let bitassetsData = yield call([api, api.getBitassetsDataAsync], assetSymbols);
    let assetsDynamicData = yield call([api, api.getAssetsDynamicDataAsync], assetSymbols);

    bitassetsData = Map(bitassetsData.filter( d => d ).map( (data) => [data.asset_name, fromJS(data)] ));
    assetsDynamicData = Map(assetsDynamicData.map( (data) => [data.asset_name, fromJS(data)] ));

    assetsByIssuer = assetsByIssuer.map( (asset, name) => {
        asset = asset.setIn(['dynamic_data'], assetsDynamicData.get(name));

        if (bitassetsData.has(name)) {
            asset = asset.setIn(['bitasset_data'], bitassetsData.get(name));
        }
        return asset
    });

    yield put(AssetsReducer.actions.receiveIssuerAssets(assetsByIssuer));
}

export function* getAsset({payload: {assetName}}) {
    let asset =  yield select(state => state.assets.getIn(['issuer_assets', assetName]));

    if (!asset) {
		asset =	yield call(fetchAsset, assetName);
    }

    yield put(AssetsReducer.actions.setReceivedAsset(asset));
}

export function* fetchAsset(assetName) {
	const assets = yield call([api, api.getAssetsAsync], [assetName])
	let asset = assets[0]

	if (asset) {
		const bitassetData = yield call([api, api.getBitassetsDataAsync], [assetName])
		const assetDynamicData = yield call([api, api.getAssetsDynamicDataAsync], [assetName])

		asset = fromJS(asset)
		asset = asset.setIn(['dynamic_data'], fromJS(assetDynamicData[0]))

		if (bitassetData[0]) {
			asset = asset.setIn(['bitasset_data'], fromJS(bitassetData[0]))
		}
	}

	return asset
}

export function* createAsset({payload: {
    account, createObject, flags, permissions, coreExchangeRate, isBitAsset, isPredictionMarket,
    bitassetOpts, description,
    confirmTitle, confirmText, successCallback, errorCallback}}) {

    const precision = utils.get_asset_precision(3);
    big.config({DECIMAL_PLACES: createObject.precision});
    let max_supply = (new big(createObject.max_supply)).times(precision).toString();
    let max_market_fee = (new big(createObject.max_market_fee || 0)).times(precision).toString();

    const createAssetObject = {
        issuer: account,
        asset_name: createObject.symbol,
        precision: parseInt(createObject.precision, 10),
        common_options: {
            max_supply: max_supply,
            market_fee_percent: createObject.market_fee_percent * 100 || 0,
            max_market_fee: max_market_fee,
            issuer_permissions: permissions,
            flags: flags,
            core_exchange_rate: {
                base:  utils.formatCer(coreExchangeRate.base, 3),
                quote: utils.formatCer(coreExchangeRate.quote, 3)
            },
            whitelist_authorities: [],
            blacklist_authorities: [],
            whitelist_markets: [],
            blacklist_markets: [],
            description: description,
            extensions: []
        },
        is_prediction_market: isPredictionMarket,
        extensions: []
    };

    if (isBitAsset) {
        createAssetObject.bitasset_opts = bitassetOpts;
    }

    yield put(transaction.actions.broadcastOperation(
        {
            type: 'asset_create',
            operation: Object.assign(createAssetObject, { __config: confirmTitle }),
            confirm: confirmText,
            successCallback,
            errorCallback
        }
    ));
}

export function* updateAsset({payload: {issuer, new_issuer, update, coreExchangeRate, asset, flags, permissions,
    isBitAsset, bitassetOpts, originalBitassetOpts, description,
    confirmTitle, confirmText, successCallback, errorCallback}}) {

    const quotePrecision = utils.get_asset_precision(3);

    big.config({DECIMAL_PLACES: asset.get("precision")});
    const maxSupply = (new big(update.max_supply)).times(quotePrecision).toString();
    const maxMarketFee = (new big(update.max_market_fee || 0)).times(quotePrecision).toString();

    const updateAssetObject = {
        issuer: issuer,
        asset_to_update: asset.get("asset_name"),
        new_issuer: new_issuer,
        new_options: {
            max_supply: maxSupply,
            max_market_fee: maxMarketFee,
            market_fee_percent: update.market_fee_percent * 100,
            description: description,
            issuer_permissions: permissions,
            flags: flags,
            whitelist_authorities: asset.getIn(["options", "whitelist_authorities"]),
            blacklist_authorities: asset.getIn(["options", "blacklist_authorities"]),
            whitelist_markets: asset.getIn(["options", "whitelist_markets"]),
            blacklist_markets: asset.getIn(["options", "blacklist_markets"]),
            extensions: asset.getIn(["options", "extensions"]),
            core_exchange_rate: {
                base:  coreExchangeRate.base,
                quote: coreExchangeRate.quote
            }
        },
        extensions: asset.get("extensions")
    };

    if (issuer === new_issuer || !new_issuer) {
        delete updateAssetObject.new_issuer;
    }

    yield put(transaction.actions.broadcastOperation(
        {
            type: 'asset_update',
            operation: Object.assign(updateAssetObject, { __config: confirmTitle }),
            confirm: confirmText,
            successCallback,
            errorCallback
        }
    ));

    if (isBitAsset && (
        bitassetOpts.feed_lifetime_sec !== originalBitassetOpts.feed_lifetime_sec ||
        bitassetOpts.minimum_feeds !== originalBitassetOpts.minimum_feeds ||
        bitassetOpts.force_settlement_delay_sec !== originalBitassetOpts.force_settlement_delay_sec ||
        bitassetOpts.force_settlement_offset_percent !== originalBitassetOpts.force_settlement_offset_percent ||
        bitassetOpts.maximum_force_settlement_volume !== originalBitassetOpts.maximum_force_settlement_volume ||
        bitassetOpts.short_backing_asset !== originalBitassetOpts.short_backing_asset)) {

        const updateBitAssetObject = {
            issuer: issuer,
            asset_to_update: asset.get("asset_name"),
            new_options: bitassetOpts,
            extensions: []
        };

        yield put(transaction.actions.broadcastOperation(
            {
                type: 'asset_update_bitasset',
                operation: updateBitAssetObject,
                successCallback,
                errorCallback
            }
        ));
    }
}


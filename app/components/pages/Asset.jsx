import React, { PropTypes } from "react";
import { connect } from 'react-redux';
import { Link } from 'react-router';
import tt from 'counterpart';
import FormattedAsset from "app/components/elements/FormattedAsset";
import FormattedPrice from "app/components/elements/FormattedPrice";
import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import AssetName from "app/components/elements/AssetName";
import assetUtils from "app/utils/Assets/AssetsUtils";
import utils from 'app/utils/Assets/utils';


class AssetFlag extends React.Component {
    render() {
        const { isSet, name } = this.props;
        if (!isSet) return ( <span></span> );

        return (
            <span className="asset-flag" style={{paddingLeft: '.3rem'}}>
                <span className="label">{tt(`user_issued_assets.${name}`)}</span>
            </span>
        );
    }
}

class AssetPermission extends React.Component {
    render() {
        const { isSet, name } = this.props;
        if (!isSet) return ( <span></span> );

        return (
            <span className="asset-flag" style={{marginRight: '.4rem', marginBottom: '.5rem'}}>
                <span className="label">{tt(`user_issued_assets.${name}`)}</span>
            </span>
        );
    }
}

class Asset extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
          fetched: false
        };
    }

    componentDidMount() {
        this.props.dispatchGetAsset(this.props.params.symbol);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.asset) {
            this.setState({fetched: true});
        }
    }

    renderFlagIndicators(flags, names) {
        return (<div>
                {names.map((name) => {
                    return <AssetFlag key={`flag_${name}`} name={name} isSet={flags[name]}/>
                })}
            </div>
        );
    }

    renderPermissionIndicators(permissions, names) {
        return (
            <div>
                {names.map((name) => {
                    return <AssetPermission key={`perm_${name}`} name={name} isSet={permissions[name]}/>
                })}
            </div>
        );
    }

    formattedPrice(price, hide_symbols=false, hide_value=false) {
        const base = price.base;
        const quote = price.quote;

        return (<span>
             <FormattedPrice
                base={base}
                quote={quote}
            />
            </span>
        );
    }

    renderSummary(asset) {
        const dynamic = asset.dynamic_data;
        const options = asset.options;
        const flagBooleans = assetUtils.getFlagBooleans(asset.options.flags, ('bitasset_data' in asset));
        const bitNames = Object.keys(flagBooleans);

        const currentSupply = (dynamic) ? (
                <tr>
                    <td> {tt('asset_jsx.current_supply')} </td>
                    <td> <FormattedAsset amount={dynamic.current_supply} asset={asset}/> </td>
                </tr>
            ) : null;

        const stealthSupply = (dynamic) ? (
                <tr>
                    <td> {tt('asset_jsx.stealth_supply')} </td>
                    <td> <FormattedAsset amount={dynamic.confidential_supply} asset={asset}/> </td>
                </tr>
            ) : null;

        const marketFee = flagBooleans["charge_market_fee"] ? (
                <tr>
                    <td> {tt('asset_jsx.market_fee')} </td>
                    <td> {options.market_fee_percent / 100.0} % </td>
                </tr>
            ) : null;

        const maxMarketFee = flagBooleans["charge_market_fee"] ? (
                <tr>
                    <td> {tt('asset_jsx.max_market_fee')} </td>
                    <td> <FormattedAsset amount={+options.max_market_fee} asset={asset} /> </td>
                </tr>
            ) : null;

        return (
            <div className="asset-card">
                <h4>{<AssetName name={asset.asset_name} />}</h4>
                <table>
                    <tbody>
                    <tr>
                        <td> {tt('asset_jsx.asset_type')} </td>
                        <td> {('bitasset_data' in asset) ? (asset.is_prediction_market ? 'Prediction' : 'Smart') : 'Simple'} </td>
                    </tr>
                    <tr>
                        <td> {tt('asset_jsx.issuer')} </td>
                        <td><Link to={`/@${asset.issuer}`}>{asset.issuer}</Link></td>
                    </tr>
                    <tr>
                        <td> {tt('asset_jsx.precision')} </td>
                        <td> {asset.precision} </td>
                    </tr>
                    {currentSupply}
                    {stealthSupply}
                    {marketFee}
                    {maxMarketFee}
                    <tr>
                        <td> {tt('asset_jsx.core_exchange_rate')} </td>
                        <td> {this.formattedPrice(options.core_exchange_rate)} </td>
                    </tr>
                    </tbody>
                </table>

                <br/>
                {this.renderFlagIndicators(flagBooleans, bitNames)}
            </div>
        );
    }

    renderPriceFeed(asset) {
        const title = (tt('asset_jsx.price_feed_title'));
        const bitAsset = asset.bitasset_data;

       if (!('current_feed' in bitAsset))
           return (
               <div className="asset-card">
                   <h4>{title}</h4>
               </div>
           );

        const currentFeed = bitAsset.current_feed;

        return (
            <div className="asset-card">
                <h4>{title}</h4>
                <table>
                    <tbody>
                    <tr>
                        <td> {tt('asset_jsx.settlement_price')} </td>
                        <td> {this.formattedPrice(currentFeed.settlement_price)} </td>
                    </tr>
                    <tr>
                        <td> {tt('asset_jsx.maintenance_collateral_ratio')} </td>
                        <td> {currentFeed.maintenance_collateral_ratio/10}% </td>
                    </tr>
                    <tr>
                        <td> {tt('asset_jsx.maximum_short_squeeze_ratio')} </td>
                        <td> {currentFeed.maximum_short_squeeze_ratio/10}% </td>
                    </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    renderPriceFeedData(asset) {
        const bitAsset = asset.bitasset_data;
        if (!('feeds' in bitAsset) || bitAsset.feeds.length == 0 || bitAsset.is_prediction_market) {
            return null;
        }

        let now = new Date().getTime();
        let oldestValidDate = new Date(now - bitAsset.options.feed_lifetime_sec * 1000);

        // Filter by valid feed lifetime, Sort by published date
        let feeds = bitAsset.feeds;
        feeds = feeds
        .filter(a => {
            return new Date(a[1][0]) > oldestValidDate;
        })
        .sort(function(feed1, feed2){
            return new Date(feed2[1][0]) - new Date(feed1[1][0])
        });

        if (!feeds.length) {
            return null;
        }

        let rows = [];
        // const settlement_price_header = feeds[0][1][1].settlement_price;
        // const core_exchange_rate_header = feeds[0][1][1].core_exchange_rate;
        const header = (
            <thead>
            <tr>
                <th> {tt('asset_jsx.settlement_price')} –
                    {/*this.formattedPrice(settlement_price_header, false, true)*/}</th>
                <th> {tt('asset_jsx.core_exchange_rate')} –
                    {/*this.formattedPrice(core_exchange_rate_header, false, true)*/}</th>
                <th> {tt('asset_jsx.maintenance_collateral_ratio')}</th>
                <th> {tt('asset_jsx.maximum_short_squeeze_ratio')}</th>
                <th> {tt('asset_jsx.publisher')}</th>
                <th> {tt('asset_jsx.published')}</th>
            </tr>
            </thead>
        );
        for (let i = 0; i < feeds.length; i++) {
            const feed = feeds[i];
            const publisher = feed[0];
            const publishDate = new Date(feed[1][0]);
            const settlement_price = feed[1][1].settlement_price;
            const core_exchange_rate = feed[1][1].core_exchange_rate;
            const maintenance_collateral_ratio = '' + feed[1][1].maintenance_collateral_ratio/10 + '%';
            const maximum_short_squeeze_ratio = '' + feed[1][1].maximum_short_squeeze_ratio/10 + '%';
            rows.push(
                <tr key={publisher}>
                    <td>{this.formattedPrice(settlement_price, true)}</td>
                    <td> {this.formattedPrice(core_exchange_rate, true)} </td>
                    <td style={{textAlign:"center"}}> {maintenance_collateral_ratio}</td>
                    <td style={{textAlign:"center"}}> {maximum_short_squeeze_ratio}</td>
                    <td>{publisher}</td>
                    <td>{publishDate.toLocaleString()}</td>
                </tr>
            );
        }

        return (
            <div className="row">
                <div className="column small-12 medium-12">
                    <div className="asset-card">
                        <h4>{tt('asset_jsx.price_feed_data_title')}</h4>
                        <table>
                            {header}
                            <tbody>
                            {rows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    render() {

        if (!this.state.fetched){
            return <center><LoadingIndicator type="circle" /></center>;
        }

        const asset = this.props.asset.toJS();
        const priceFeed = ('bitasset_data' in asset) ? this.renderPriceFeed(asset) : null;
        const priceFeedData = ('bitasset_data' in asset) ? this.renderPriceFeedData(asset) : null;
        const description = assetUtils.parseDescription(asset.options.description);
        const short_name = description.short_name ? description.short_name : null;

        let preferredMarket = description.market ? description.market : "GOLOS";
        if ("bitasset_data" in asset && asset.bitasset_data.is_prediction_market) {
            preferredMarket = asset.bitasset_data.options.short_backing_asset;
        }

        const { name, prefix } = utils.replaceName(asset.asset_name, "bitasset_data" in asset);

        const aboutBox = (
            <div className="asset-card">
                <h3>{tt('asset_jsx.title')} {(prefix || "") + name}</h3>
                <p>{description.main}</p>
                <p><Link to={`/@${asset.issuer}`}>{asset.issuer}</Link></p>
                {short_name ? <p>{short_name}</p> : null}
                <a style={{textTransform: "uppercase"}} href={`/market/${preferredMarket}_${asset.asset_name}`}>{tt('asset_jsx.market')}</a>
            </div>
        );

        const options = asset.options;
        const permissionBooleans = assetUtils.getFlagBooleans(asset.options.issuer_permissions, ('bitasset_data' in asset) ? asset.bitasset_data : false);
        const bitNames = Object.keys(permissionBooleans);

        const permissions = (<div className="asset-card">
            <h4>{tt('asset_jsx.permissions_title')}</h4>
            <table>
                <tbody>
                {permissionBooleans["charge_market_fee"]
                    ? (<tr>
                        <td> {tt('asset_jsx.max_market_fee')} </td>
                        <td> <FormattedAsset amount={+options.max_market_fee} asset={asset} /> </td>
                    </tr>)
                    : null
                }
                <tr>
                    <td> {tt('asset_jsx.max_supply')} </td>
                    <td> <FormattedAsset amount={+options.max_supply} asset={asset} /> </td>
                </tr>
                </tbody>
            </table>

            <br/>
            {this.renderPermissionIndicators(permissionBooleans, bitNames)}
            <br/>
        </div>);

        return (
            <div className="row">
                <div className="column small-12 medium-12">
                    <div className="row">
                        <div className="column small-12">
                            {aboutBox}
                        </div>
                    </div>
                    <div className="row">
                        <div className="column small-12 medium-6">
                            {this.renderSummary(asset)}
                        </div>
                        <div className="column small-12 medium-6">
                            {permissions}
                        </div>
                    </div>
                    <div className="row">
                        <div className="column small-12 medium-6">
                            {priceFeed ? priceFeed : null}
                        </div>
                    </div>
                    {priceFeedData}
                </div>
            </div>
        );
    }
}

module.exports = {
    path: 'asset/:symbol',
    component: connect(
        (state, ownProps) => {
            if (!process.env.BROWSER) {
                return {
					asset: null
                }
            }
            const asset = state.assets.get('asset');
            return {...ownProps, asset}
        },
        dispatch => ({
            dispatchGetAsset : (assetName) => {
                dispatch({type: 'GET_ASSET', payload: {assetName}})
            }
        })
    )(Asset)
};


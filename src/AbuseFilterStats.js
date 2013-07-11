/**
 * Generates a table with statistics about abuse filters
 * @author: [[User:Helder.wiki]]
 * @tracking: [[Special:GlobalUsage/User:Helder.wiki/Tools/AbuseFilterStats.js]] ([[File:User:Helder.wiki/Tools/AbuseFilterStats.js]])
 */
/*jshint browser: true, camelcase: false, curly: true, eqeqeq: true, immed: true, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: true, undef: true, unused: true, strict: true, trailing: true, laxbreak: true, maxlen: 120, evil: true, onevar: true */
/*global jQuery, mediaWiki */
( function ( mw, $ ) {
'use strict';

var api = new mw.Api(),
	stats = [
		[ 'Filtro', 'Detecções', 'Conferidas', '%', 'Falsos positivos', '% das conferidas' ]
	],
	verificationPages = [];

function printTable( table ){
	var i, checked, errors, hits,
		wikicode = [
			'{| class="wikitable sortable plainlinks"',
			'|+ Controle de qualidade dos filtros de edição',
			'|-',
			'! data-sort-type="number" | Filtro',
			'! data-sort-type="number" | Detecções',
			'! data-sort-type="number" | Conferidas',
			'! data-sort-type="number" | %',
			'! data-sort-type="number" | Falsos<br />positivos',
			'! data-sort-type="number" | % das<br />conferidas'
		].join( '\n' );
	for ( i = 1; i < table.length; i++ ){
		hits = table[i].hits;
		checked = table[i].checked;
		errors = table[i].errors;
		wikicode += '\n|-\n| ' + [
			'[[Especial:Filtro de abusos/' + i + '|' + i + ']]',
			'[{{fullurl:Especial:Registro de abusos|wpSearchFilter=' + i + '}} ' + hits + ']',
			'[[WP:Filtro de edições/Falsos positivos/Filtro ' + i + '|' + checked + ']]',
			hits === 0
				? '-'
				: ( 100 * checked / hits ).toFixed( 1 ) + '%',
			errors === undefined
				? '-'
				: errors,
			errors === undefined || checked === 0
				? '-'
				: ( 100 * errors / checked ).toFixed( 1 ) + '%'
		].join( ' || ' );
	}
	wikicode += '\n|}';
	
	$( '#mw-content-text' )
		.prepend(
			'<b>O código da tabela atualizada é apresentado abaixo:</b><br /><br />' +
			'<textarea cols="80" rows="10" style="width: 100%; font-family: monospace; line-height: 1.5em;">' +
				mw.html.escape( wikicode ) +
			'</textarea>'
		);
	$.removeSpinner( 'spinner-filter-stats' );
	// $( 'table.sortable' ).tablesorter();
}

function getAbuseFilterStats(){
	var param,
		d = new Date(),
		firstDay = new Date(d.getFullYear(), d.getMonth(), 1),
		// end of the current month
		lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
		// end of the first week of the current month
		// lastDay = new Date(d.getFullYear(), d.getMonth(), 7, 23, 59, 59),
		getLog = function( queryContinue ){
			if( queryContinue ){
				$.extend( param, queryContinue );
			}
			api.get( param )
			.done( function ( data ) {
				var i, list, log, match;
				list = data.query.abuselog;
				for ( i = 0; i < list.length; i++ ){
					log = list[i];
					if ( stats[ log.filter_id ] === undefined ){
						stats[ log.filter_id ] = {
							hits: 0,
							checked: 0,
							errors: 0
						};
					} else {
						stats[ log.filter_id ].hits += 1;
						match = verificationPages[ log.filter_id ]
							&& verificationPages[ log.filter_id ]
								.match( new RegExp( '\\{\\{[Aa]ção *\\|[^}]*(?:1 *= *)?' + log.id +'[^}]*\\}\\}' ) );
						if ( match ){
							stats[ log.filter_id ].checked += 1;
							if ( /erro *= *sim/.test( match[0] ) ){
								stats[ log.filter_id ].errors += 1;
							}
						}
					}
				}
				if( data[ 'query-continue' ] ){
					getLog( data[ 'query-continue' ].abuselog );
				} else {
					for ( i = 1; i < stats.length; i++ ){
						if ( !stats[i] ){
							stats[i] = {
								hits: 0,
								checked: 0
							};
						}
					}
					printTable( stats );
				}
			} )
			.fail( function ( data ) {
				mw.log( data.query );
				$.removeSpinner( 'spinner-filter-stats' );
			} );
		};
	$( '#firstHeading' ).injectSpinner( 'spinner-filter-stats' );
	param = {
		list: 'abuselog',
		afllimit: 'max',
		// aflfilter: 123,
		aflstart: firstDay.toISOString(),
		aflend: lastDay.toISOString(),
		aflprop: 'ids|filter|user|title|action|result|timestamp|hidden|revid', // removed: details|ip
		afldir: 'newer'
	};
	getLog();
}

function getVerificationPages(){
	api.get( {
		action: 'query',
		prop: 'revisions',
		rvprop: 'content',
		generator: 'embeddedin',
		geititle: 'Predefinição:Lista de falsos positivos (cabeçalho)',
		geinamespace: 4,
		geilimit: 10,
	} )
	.done( function ( data ) {
		$.each( data.query.pages, function(id){
			var filter = data.query.pages[ id ].title.match( /\d+$/ );
			if( filter && filter[0] ){
				verificationPages[ filter[0] ] = data.query.pages[ id ].revisions[0]['*'];
			}
		} );
		getAbuseFilterStats();
	} )
	.fail( function ( data ) {
		mw.log( data );
	} );
}

function addAbuseFilterStatsLink(){
	$( mw.util.addPortletLink(
		'p-cactions',
		'#',
		'Estatísticas dos filtros',
		'ca-AbuseFilterStatsLink',
		'Gerar uma tabela com estatísticas sobre os filtros de edição'
	) ).click( function( e ){
		e.preventDefault();
		mw.loader.using( [
			'mediawiki.api.edit',
			'jquery.spinner',
			'jquery.tablesorter',
			'jquery.mwExtension'
		], getVerificationPages );
	} );
}

if ( mw.config.get( 'wgPageName' ) === 'Wikipédia:Filtro_de_edições/Estatísticas' ) {
	$( addAbuseFilterStatsLink );
}

}( mediaWiki, jQuery ) );
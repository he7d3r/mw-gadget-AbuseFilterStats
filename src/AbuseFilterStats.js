/**
 * Generates a table with statistics about abuse filters
 * @author: [[User:Helder.wiki]]
 * @tracking: [[Special:GlobalUsage/User:Helder.wiki/Tools/AbuseFilterStats.js]] ([[File:User:Helder.wiki/Tools/AbuseFilterStats.js]])
 */
/*jshint browser: true, camelcase: false, curly: true, eqeqeq: true, immed: true, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: true, undef: true, unused: true, strict: true, trailing: true, laxbreak: true, devel: true, maxlen: 120, evil: true, onevar: true */
/*global jQuery, mediaWiki */
( function ( mw, $ ) {
'use strict';

var api = new mw.Api(),
	stats, verificationPages, d, month;

function printTable( table ){
	var $target, i, checked, errors, hits, id,
		pad = function( n ){
			return n < 10 ? '0' + n : n;
		},
		tableId = 'af-stats-' + d.getFullYear() + '-' + pad( month ),
		wikicode = [
			'{| id="' + tableId + '" class="wikitable sortable plainlinks"',
			'|+ Controle de qualidade dos filtros de edição',
			'|-',
			'! data-sort-type="number" | Filtro',
			'! data-sort-type="number" | Detecções',
			'! data-sort-type="number" | Conferidas',
			'! data-sort-type="number" | %',
			'! data-sort-type="number" | Falsos<br />positivos',
			'! data-sort-type="number" | % das<br />conferidas' /*,
			'! data-sort-type="number" | % máximo' */
		].join( '\n' );
	table.sort( function( a, b ) {
		return b.hits - a.hits;
	} );
	for ( i = 0; i < table.length; i++ ){
		if( !table[i] ){
			continue;
		}
		id = table[i].id;
		hits = table[i].hits;
		checked = table[i].checked;
		errors = table[i].errors;
		wikicode += '\n|-\n| ' + [
			'[[Especial:Filtro de abusos/' + id + '|' + id + ']]',
			'[{{fullurl:Especial:Registro de abusos|dir=prev&wpSearchFilter=' +
				id + '&offset=' + d.getFullYear() + pad( month ) +
				'01000000&limit=' + hits + '}} ' + hits + ']',
			'[[WP:Filtro de edições/Falsos positivos/Filtro ' + id + '|' + checked + ']]',
			hits === 0
				? '-'
				: ( 100 * checked / hits ).toFixed( 1 ) + '%',
			errors === undefined
				? '-'
				: errors,
			errors === undefined || checked === 0
				? '-'
				: ( 100 * errors / checked ).toFixed( 1 ) + '%' /*,
			errors === undefined || hits === 0
				? '-'
				: ( 100 * (errors + hits - checked) / hits ).toFixed( 1 ) + '%' */
		].join( '\n| ' );
	}
	wikicode += '\n|}';

	$target = $( '#abuse-filter-stats-result' );
	if ( !$target.length ){
		$target = $( '<div id="abuse-filter-stats-result">' ).prependTo( '#mw-content-text' );
	}
	$target.empty().append(
		'<b>O código da tabela atualizada é apresentado abaixo:</b><br /><br />' +
		'<textarea cols="80" rows="10" style="width: 100%; font-family: monospace; line-height: 1.5em;">' +
			mw.html.escape( wikicode ) +
		'</textarea>'
	);
	$.removeSpinner( 'spinner-filter-stats' );
	// $( 'table.sortable' ).tablesorter();
}

function getAbuseFilterStats(){
	var param, firstDay, lastDay, getLog;
	d = new Date();
	month = prompt(
		'Deseja obter as estatísticas referentes a que mês?' +
			' (forneça um número natural de 1 a 12)',
		d.getMonth() + 1
	);
	if ( month === null ){
		return;
	}
	month = parseInt( month, 10 );
	if ( isNaN( month ) || month < 0 || 11 < month ){
		alert( 'Operação cancelada! O mês fornecido não é válido.' );
		return;
	}
	firstDay = new Date(d.getFullYear(), month - 1, 1);
	// end of the current month
	lastDay = new Date(d.getFullYear(), month, 0, 23, 59, 59);
	// end of the first week of the current month
	// lastDay = new Date(d.getFullYear(), d.getMonth(), 7, 23, 59, 59);
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
				if ( log.filter_id === '' ){
					continue;
				}
				if ( stats[ log.filter_id ] === undefined ){
					stats[ log.filter_id ] = {
						id: log.filter_id,
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
							id: i,
							hits: 0,
							checked: 0
						};
					}
				}
				printTable( stats );
			}
		} )
		.fail( function () {
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
		aflprop: 'ids', // |filter|user|title|action|result|timestamp|hidden|revid|details|ip
		afldir: 'newer'
	};
	getLog();
}

function getVerificationPages(){
	stats = [];
	verificationPages = [];
	api.get( {
		action: 'query',
		prop: 'revisions',
		rvprop: 'content',
		generator: 'embeddedin',
		geititle: 'Predefinição:Lista de falsos positivos (cabeçalho)',
		geinamespace: 4,
		geilimit: 'max'
	} )
	.done( function ( data ) {
		$.each( data.query.pages, function(id){
			var filter = data.query.pages[ id ].title.match( /\d+$/ );
			if( filter && filter[0] ){
				verificationPages[ filter[0] ] = data.query.pages[ id ].revisions[0]['*'];
			}
		} );
		getAbuseFilterStats();
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
			'mediawiki.api',
			'jquery.spinner',
			// 'jquery.tablesorter',
			'jquery.mwExtension'
		], getVerificationPages );
	} );
}

if ( mw.config.get( 'wgPageName' ) === 'Wikipédia:Filtro_de_edições/Estatísticas' ) {
	$( addAbuseFilterStatsLink );
}

}( mediaWiki, jQuery ) );
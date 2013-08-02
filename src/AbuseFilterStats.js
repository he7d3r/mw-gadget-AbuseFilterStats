/**
 * Generates a table with statistics about abuse filters
 * @author: [[User:Helder.wiki]]
 * @tracking: [[Special:GlobalUsage/User:Helder.wiki/Tools/AbuseFilterStats.js]] ([[File:User:Helder.wiki/Tools/AbuseFilterStats.js]])
 */
/*jshint browser: true, camelcase: false, curly: true, eqeqeq: true, immed: true, latedef: true, newcap: true, noarg: true, noempty: true, nonew: true, quotmark: true, undef: true, unused: true, strict: true, trailing: true, laxbreak: true, devel: true, maxlen: 120, evil: true, onevar: true */
/*global jQuery, mediaWiki */
( function ( mw, $ ) {
'use strict';

mw.messages.set( {
	'afs-missing-filter-version': 'Não foi possível encontrar a versão do filtro $1 correspondente ao log $2.',
	'afs-invalid-month': 'Operação cancelada! O mês fornecido não é válido.',
	'afs-month-question': 'Deseja obter as estatísticas referentes a que mês?' +
		' (forneça um número natural de 1 a 12)',
	'afs-link': 'Estatísticas dos filtros',
	'afs-link-description': 'Gerar uma tabela com estatísticas sobre os filtros de edição',
	'afs-missing-filter-revisions': 'Não foram encontradas revisões do filtro $1',
	'afs-header-template': 'Predefinição:Lista de falsos positivos (cabeçalho)',
	'afs-template-regex': '\\{\\{[Aa]ção *\\|[^}]*(?:1 *= *)?$1[^}]*\\}\\}',
	'afs-result-intro': 'O código da tabela atualizada é apresentado abaixo:',
	'afs-analysis-link': '[[WP:Filtro de edições/Falsos positivos/Filtro $1|$2]]',
	'afs-table-yes': '{{Tabela-sim}}',
	'afs-table-no': '{{Tabela-não}}',
	'afs-table-header': 'Controle de qualidade dos filtros de edição',
	'afs-table-filter': 'Filtro',
	'afs-table-date': 'Data',
	'afs-table-description': 'Descrição',
	'afs-table-settings': 'Configurações do filtro',
	'afs-table-hits': 'Total',
	'afs-table-hits-text': 'Número de registros',
	'afs-table-disallow': 'Impedir',
	'afs-table-warn': 'Avisar',
	'afs-table-tag': 'Etiquetar',
	'afs-table-total': 'Total',
	'afs-table-warnings': 'Avisos<br />enviados',
	'afs-table-saved-text': 'Edições salvas<ref>Não apagadas?</ref>',
	'afs-table-checked-text': '[[WP:Filtro de edições/Falsos positivos|Ações conferidas]]',
	'afs-table-saved': 'Total',
	'afs-table-saved-percent': '% dos<br />registros',
	'afs-table-checked': 'Total',
	'afs-table-checked-percent': '% dos<br />registros',
	'afs-table-false-positives-text': 'Falsos positivos',
	'afs-table-false-positives': 'Total',
	'afs-table-false-positives-percent': '% dos<br />conferidos',
	'afs-table-false-positives-percent-max': '% máximo'
} );

var api, stats, d, month;

function removeSpinner() {
	$.removeSpinner( 'spinner-filter-stats' );
}

function printTable( table ){
	var $target, i, checked, errors, hits, id,
		pad = function( n ){
			return n < 10 ? '0' + n : n;
		},
		tableId = 'af-stats-' + d.getFullYear() + '-' + pad( month ),
		wikicode = [
			'{| id="' + tableId + '" class="wikitable sortable plainlinks"',
			'|+ ' + mw.msg( 'afs-table-header' ),
			'|-',
			'! rowspan=4 data-sort-type="number" | ' + mw.msg( 'afs-table-filter' ),
			'! rowspan=4 data-sort-type="text" | ' + mw.msg( 'afs-table-description' ),
			'! colspan=3 | ' + mw.msg( 'afs-table-settings' ),
			'! colspan=8 | ' + mw.msg( 'afs-table-hits-text' ),
			'|-',
			'! rowspan=3 data-sort-type="text" | ' + mw.msg( 'afs-table-disallow' ),
			'! rowspan=3 data-sort-type="text" | ' + mw.msg( 'afs-table-warn' ),
			'! rowspan=3 data-sort-type="text" | ' + mw.msg( 'afs-table-tag' ),
			'! rowspan=3 data-sort-type="number" | ' + mw.msg( 'afs-table-hits' ),
			'! rowspan=3 data-sort-type="number" | ' + mw.msg( 'afs-table-warnings' ),
			'! colspan=2 | ' + mw.msg( 'afs-table-saved-text' ),
			'! colspan=4 | ' + mw.msg( 'afs-table-checked-text' ),
			'|-',
			'! rowspan=2 data-sort-type="number" | ' + mw.msg( 'afs-table-saved' ),
			'! rowspan=2 data-sort-type="number" | ' + mw.msg( 'afs-table-saved-percent'),
			'! rowspan=2 data-sort-type="number" | ' + mw.msg( 'afs-table-checked' ),
			'! rowspan=2 data-sort-type="number" | ' + mw.msg( 'afs-table-checked-percent'),
			'! colspan=2 | ' + mw.msg( 'afs-table-false-positives-text' ),
			'|-',
			'! data-sort-type="number" | ' + mw.msg( 'afs-table-false-positives' ),
			'! data-sort-type="number" | ' + mw.msg( 'afs-table-false-positives-percent' ) /*,
			'! data-sort-type="number" | ' + mw.msg( 'afs-table-false-positives-percent-max' ) */
		].join( '\n' );
	/*
	table.sort( function( a, b ) {
		return b.hitsInPeriod - a.hitsInPeriod;
	} );
	*/
	for ( i = 0; i < table.length; i++ ){
		if( !table[i] ){
			continue;
		}
		id = table[i].id;

		hits = table[i].hitsInPeriod;
		checked = table[i].checked;
		errors = table[i].errors;
		wikicode += '\n|-\n| ' + [
			'[[Special:AbuseFilter/' + id + '|' + id + ']]',

			table[i].description,
			table[i].actions.indexOf( 'disallow' ) !== -1 ?
				mw.message( 'afs-table-yes' ).plain():
				mw.message( 'afs-table-no' ).plain(),
			table[i].actions.indexOf( 'warn' ) !== -1 ?
				mw.message( 'afs-table-yes' ).plain():
				mw.message( 'afs-table-no' ).plain(),
			table[i].actions.indexOf( 'tag' ) !== -1 ?
				mw.message( 'afs-table-yes' ).plain():
				mw.message( 'afs-table-no' ).plain(),
			'[{{fullurl:Special:AbuseLog|dir=prev&wpSearchFilter=' +
				id + '&offset=' + d.getFullYear() + pad( month ) +
				'01000000&limit=' + hits + '}} ' + hits + ']',
			table[i].warnings,
			table[i].savedEdits,
			hits === 0
				? '-'
				: ( 100 * table[i].savedEdits / hits ).toFixed( 1 ) + '%',
			mw.msg( 'afs-analysis-link', id, checked ),
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
	wikicode += '\n|}\n<references/>';

	$target = $( '#abuse-filter-stats-result' );
	if ( !$target.length ){
		$target = $( '<div id="abuse-filter-stats-result">' ).prependTo( '#mw-content-text' );
	}
	$target.empty().append(
		'<b>' + mw.msg( 'afs-result-intro' ) + '</b><br /><br />' +
		'<textarea cols="80" rows="10" style="width: 100%; font-family: monospace; line-height: 1.5em;">' +
			mw.html.escape( wikicode ) +
		'</textarea>'
	);
	$.removeSpinner( 'spinner-filter-stats' );
	// $( 'table.sortable' ).tablesorter();
}

function generateAbuseFilterStats( ){
	var param, firstDay, lastDay, getLog;
	d = new Date();
	month = prompt( mw.msg( 'afs-month-question' ), d.getMonth() + 1 );
	if ( month === null ){
		return;
	}
	month = parseInt( month, 10 );
	if ( isNaN( month ) || month < 0 || 11 < month ){
		alert( mw.msg( 'afs-invalid-month' ) );
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
			var i, log, analysis, filterInfo;
			for ( i = 0; i < data.query.abuselog.length; i++ ){
				log = data.query.abuselog[i];
				filterInfo = stats[ log.filter_id ];
				filterInfo.hitsInPeriod += 1;
				analysis = filterInfo.analysisText
					.match( new RegExp( mw.msg( 'afs-template-regex', log.id ) ) );
				if ( analysis ){
					filterInfo.checked += 1;
					if ( /erro *= *sim/.test( analysis[0] ) ){
						filterInfo.errors += 1;
					}
				}
				if ( log.revid !== undefined ){
					filterInfo.savedEdits += 1;
				}
				if ( log.result.indexOf( 'warn' ) !== -1 ){
					filterInfo.warnings += 1;
				}
			}
			if( data[ 'query-continue' ] ){
				getLog( data[ 'query-continue' ].abuselog );
			} else {
				printTable( stats );
			}
		} )
		.fail( removeSpinner );
	};
	$( '#firstHeading' ).injectSpinner( 'spinner-filter-stats' );
	param = {
		list: 'abuselog',
		afllimit: 'max',
		// aflfilter: 123,
		aflstart: firstDay.toISOString(),
		aflend: lastDay.toISOString(),
		aflprop: 'ids|revid|result', // |filter|user|title|action|timestamp|hidden|details|ip
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
		geititle: mw.msg( 'afs-header-template' ),
		geinamespace: 4,
		geilimit: 'max'
	} )
	.done( function ( data ) {
		var i;
		$.each( data.query.pages, function(id){
			var filter = data.query.pages[ id ].title.match( /\d+$/ );
			if( filter && filter[0] ){
				stats[ filter[0] ].analysisText =
					data.query.pages[ id ].revisions[0]['*'];
			}
		} );
		for ( i = 1; i < stats.length; i++ ){
			stats[i] = $.extend( {
				id: i,
				hitsInPeriod: 0,
				savedEdits: 0,
				warnings: 0,
				checked: 0,
				errors: 0,
				analysisText: ''
			}, stats[i] );
		}
		generateAbuseFilterStats();
	} )
	.fail( removeSpinner );
}

function getFilterList(){
	api = new mw.Api();
	stats = [];
	api.get( {
		action: 'query',
		list: 'abusefilters',
		abflimit: 'max',
		abfprop: 'id|description|actions|status|private'
	} )
	.done( function ( data ) {
		$.each( data.query.abusefilters, function( i ){
			stats[ data.query.abusefilters[ i ].id ] = data.query.abusefilters[ i ];
		} );
		getVerificationPages();
	} )
	.fail( removeSpinner );
}

function addAbuseFilterStatsLink(){
	$( mw.util.addPortletLink(
		'p-cactions',
		'#',
		mw.msg( 'afs-link' ),
		'ca-AbuseFilterStatsLink',
		mw.msg( 'afs-link-description' )
	) ).click( function( e ){
		e.preventDefault();
		mw.loader.using( [
			'mediawiki.api',
			'jquery.spinner',
			// 'jquery.tablesorter',
			'jquery.mwExtension'
		], getFilterList );
	} );
}

if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'AbuseFilter'
	|| ( mw.config.get( 'wgDBname' ) === 'ptwiki'
		&& mw.config.get( 'wgPageName' ).indexOf( 'Wikipédia:Filtro_de_edições' ) !== -1
	)
) {
	$( addAbuseFilterStatsLink );
}

}( mediaWiki, jQuery ) );
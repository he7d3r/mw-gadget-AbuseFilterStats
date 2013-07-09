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

function printTable(){
	var i,
		$tr = $( '<tr>' ),
		$tbody = $( '<tbody>' )
			.append( $tr ),
		$table = $( '<table>' )
			.addClass( 'wikitable sortable' )
			.append( $tbody ),
		$target = $( '#mw-content-text' )
			.empty();
	for ( i = 0; i < stats[0].length; i++ ){
		$tr.append(
			$( '<th>' )
				.text( stats[0][i] )
				.attr( 'data-sort-type', 'number' )
		);
	}
	for ( i = 1; i < stats.length; i++ ){
		$tbody.append(
			$( '<tr>' ).append(
				$( '<td>' ).text( i ),
				$( '<td>' ).text( stats[i].hits ),
				$( '<td>' ).text( stats[i].checked ),
				$( '<td>' ).text( stats[i].hits === 0
						? '-'
						: ( 100 * stats[i].checked / stats[i].hits ).toFixed( 1 ) + '%'
					),
				$( '<td>' ).text( stats[i].errors === undefined
						? '-'
						: stats[i].errors
					),
				$( '<td>' ).text( stats[i].errors === undefined || stats[i].checked === 0
						? '-'
						: ( 100 * stats[i].errors / stats[i].checked ).toFixed( 1 ) + '%'
					)
			)
		);
	}
	$target.append( $table.tablesorter() );
	$.removeSpinner( 'spinner-filter-stats' );
}

function getAbuseFilterStats(){
	var param,
		d = new Date(),
		firstDay = new Date(d.getFullYear(), d.getMonth(), 1),
		lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59), // end of the current month
		// lastDay = new Date(d.getFullYear(), d.getMonth(), 7, 23, 59, 59), // end of the first week of the current month
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
					printTable();
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
		mw.loader.using( [ 'mediawiki.api.edit', 'jquery.spinner', 'jquery.tablesorter' ], getVerificationPages );
	} );
}

if ( mw.config.get( 'wgPageName' ) === 'Wikipédia:Filtro_de_edições/Estatísticas' ) {
	$( addAbuseFilterStatsLink );
}

}( mediaWiki, jQuery ) );
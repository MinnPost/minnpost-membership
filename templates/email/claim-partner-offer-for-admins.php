<?php
/**
 * The template for the email sent to admins when a partner offer is claimed
 *
 */
// default message

$msg = '';

$msg .= __( 'One of the open partner offers has just been claimed.', 'minnpost-membership' ) . "\r\n\r\n";

$msg .= sprintf(
	// translators: param 1 is the title of the partner offer
	__( '- Offer title: %1$s', 'minnpost-membership' ),
	$attributes['partner_offer']->post_title,
	"\r\n\r\n"
);

$msg .= sprintf(
	// translators: param 1 is the claimed instance number
	__( '- Claimed instance number: %1$s', 'minnpost-membership' ),
	$attributes['instance_id'],
	"\r\n\r\n"
);

$msg .= sprintf(
	// translators: param 1 is the edit link for the partner offer
	__( '- Offer edit link: %1$s', 'minnpost-membership' ),
	admin_url( 'post.php?post=' . $attributes['partner_offer']->ID . '&action=edit' ),
	"\r\n\r\n"
);

$msg .= sprintf(
	// translators: param 1 is the date/time when the instance was claimed
	__( 'Date/Time Claimed: %1$s', 'minnpost-membership' ),
	date_i18n( get_option( 'date_format' ), $attributes['partner_offer']->instances[ $attributes['instance_id'] ]['_mp_partner_offer_claimed_date'] ) . ' @ ' . date_i18n( get_option( 'time_format' ), $attributes['partner_offer']->instances[ $attributes['instance_id'] ]['_mp_partner_offer_claimed_date'] ),
	"\r\n\r\n"
);

$msg .= sprintf(
	// translators: param 1 is the user's name
	__( '- Claiming user name: %1$s', 'minnpost-membership' ),
	$attributes['partner_offer']->instances[ $attributes['instance_id'] ]['_mp_partner_offer_claim_user']['name'],
	"\r\n\r\n"
);

$msg .= sprintf(
	// translators: param 1 is the edit link for the user
	__( '- Claiming user edit link: %1$s', 'minnpost-membership' ),
	admin_url( 'post.php?post=' . $attributes['partner_offer']->instances[ $attributes['instance_id'] ]['_mp_partner_offer_claim_user']['id'] . '&action=edit' ),
	"\r\n\r\n"
);

echo $msg;

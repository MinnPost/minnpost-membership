<?php
/**
 * Class file for the MinnPost_Membership_Content_Items class.
 *
 * @file
 */

if ( ! class_exists( 'MinnPost_Membership' ) ) {
	die();
}

/**
 * Create default structure for content items
 */
class MinnPost_Membership_Content_Items {

	protected $option_prefix;
	protected $version;
	protected $slug;
	protected $member_levels;
	protected $user_info;
	protected $cache;

	/**
	* Constructor which sets up content items
	*
	* @param string $option_prefix
	* @param string $version
	* @param string $slug
	* @param object $member_levels
	* @param object $user_info
	* @param object $cache
	* @throws \Exception
	*/
	public function __construct( $option_prefix, $version, $slug, $member_levels, $user_info, $cache ) {

		$this->option_prefix = $option_prefix;
		$this->version       = $version;
		$this->slug          = $slug;
		$this->member_levels = $member_levels;
		$this->user_info     = $user_info;
		$this->cache         = $cache;

		$this->mp_mem_transients = $this->cache->mp_mem_transients;

		$this->add_actions();

	}

	/**
	* Create the action hooks to create content items
	*
	*/
	public function add_actions() {
		add_action( 'init', array( $this, 'create_partner' ), 0 );
		add_action( 'init', array( $this, 'create_partner_offer' ), 0 );
		add_action( 'admin_menu', array( $this, 'create_sub_menus' ), 20 );
		add_filter( 'enter_title_here', array( $this, 'title_placeholders' ), 10, 1 );
		add_action( 'cmb2_init', array( $this, 'create_partner_fields' ) );
		add_action( 'cmb2_init', array( $this, 'create_partner_offer_fields' ) );
	}

	/**
	* Create the partner content type
	*
	*/
	public function create_partner() {

		$labels = array(
			'name'                  => _x( 'Partners', 'Post Type General Name', 'minnpost-membership' ),
			'singular_name'         => _x( 'Partner', 'Post Type Singular Name', 'minnpost-membership' ),
			'menu_name'             => __( 'Partners', 'minnpost-membership' ),
			'name_admin_bar'        => __( 'Partner', 'minnpost-membership' ),
			'archives'              => __( 'Partner Archives', 'minnpost-membership' ),
			'attributes'            => __( 'Partner Attributes', 'minnpost-membership' ),
			'parent_item_colon'     => __( 'Parent Partner:', 'minnpost-membership' ),
			'all_items'             => __( 'All Partners', 'minnpost-membership' ),
			'add_new_item'          => __( 'Add New Partner', 'minnpost-membership' ),
			'add_new'               => __( 'Add New', 'minnpost-membership' ),
			'new_item'              => __( 'New Partner', 'minnpost-membership' ),
			'edit_item'             => __( 'Edit Partner', 'minnpost-membership' ),
			'update_item'           => __( 'Update Partner', 'minnpost-membership' ),
			'view_item'             => __( 'View Partner', 'minnpost-membership' ),
			'view_items'            => __( 'View Partners', 'minnpost-membership' ),
			'search_items'          => __( 'Search Partner', 'minnpost-membership' ),
			'not_found'             => __( 'Not found', 'minnpost-membership' ),
			'not_found_in_trash'    => __( 'Not found in Trash', 'minnpost-membership' ),
			'featured_image'        => __( 'Featured Image', 'minnpost-membership' ),
			'set_featured_image'    => __( 'Set featured image', 'minnpost-membership' ),
			'remove_featured_image' => __( 'Remove featured image', 'minnpost-membership' ),
			'use_featured_image'    => __( 'Use as featured image', 'minnpost-membership' ),
			'insert_into_item'      => __( 'Insert into partner', 'minnpost-membership' ),
			'uploaded_to_this_item' => __( 'Uploaded to this partner', 'minnpost-membership' ),
			'items_list'            => __( 'Partners list', 'minnpost-membership' ),
			'items_list_navigation' => __( 'Partners list navigation', 'minnpost-membership' ),
			'filter_items_list'     => __( 'Filter partners list', 'minnpost-membership' ),
		);
		$args   = array(
			'label'               => __( 'Partner', 'minnpost-membership' ),
			'description'         => __( 'Partner organizations that can provide offers', 'minnpost-membership' ),
			'labels'              => $labels,
			'supports'            => array( 'title', 'revisions' ),
			'hierarchical'        => true,
			'public'              => true,
			'show_ui'             => true,
			'show_in_menu'        => false,
			'show_in_admin_bar'   => true,
			'show_in_nav_menus'   => true,
			'can_export'          => true,
			'has_archive'         => false,
			'exclude_from_search' => true,
			'publicly_queryable'  => true,
			'capability_type'     => 'page',
		);
		register_post_type( 'partner', $args );
	}

	/**
	* Create the partner offer content type
	*
	*/
	public function create_partner_offer() {

		$labels = array(
			'name'                  => _x( 'Partner Offers', 'Post Type General Name', 'minnpost-membership' ),
			'singular_name'         => _x( 'Partner Offer', 'Post Type Singular Name', 'minnpost-membership' ),
			'menu_name'             => __( 'Partner Offers', 'minnpost-membership' ),
			'name_admin_bar'        => __( 'Partner Offer', 'minnpost-membership' ),
			'archives'              => __( 'Partner Offer Archives', 'minnpost-membership' ),
			'attributes'            => __( 'Partner Offer Attributes', 'minnpost-membership' ),
			'parent_item_colon'     => __( 'Parent Partner Offer:', 'minnpost-membership' ),
			'all_items'             => __( 'All Partner Offers', 'minnpost-membership' ),
			'add_new_item'          => __( 'Add New Partner Offer', 'minnpost-membership' ),
			'add_new'               => __( 'Add New', 'minnpost-membership' ),
			'new_item'              => __( 'New Partner Offer', 'minnpost-membership' ),
			'edit_item'             => __( 'Edit Partner Offer', 'minnpost-membership' ),
			'update_item'           => __( 'Update Partner Offer', 'minnpost-membership' ),
			'view_item'             => __( 'View Partner Offer', 'minnpost-membership' ),
			'view_items'            => __( 'View Partner Offers', 'minnpost-membership' ),
			'search_items'          => __( 'Search Partner Offers', 'minnpost-membership' ),
			'not_found'             => __( 'Not found', 'minnpost-membership' ),
			'not_found_in_trash'    => __( 'Not found in Trash', 'minnpost-membership' ),
			'featured_image'        => __( 'Featured Image', 'minnpost-membership' ),
			'set_featured_image'    => __( 'Set featured image', 'minnpost-membership' ),
			'remove_featured_image' => __( 'Remove featured image', 'minnpost-membership' ),
			'use_featured_image'    => __( 'Use as featured image', 'minnpost-membership' ),
			'insert_into_item'      => __( 'Insert into partner offer', 'minnpost-membership' ),
			'uploaded_to_this_item' => __( 'Uploaded to this partner offer', 'minnpost-membership' ),
			'items_list'            => __( 'Partner Offers list', 'minnpost-membership' ),
			'items_list_navigation' => __( 'Partner Offers list navigation', 'minnpost-membership' ),
			'filter_items_list'     => __( 'Filter partner offers list', 'minnpost-membership' ),
		);
		$args   = array(
			'label'               => 'Partner offer',
			'description'         => 'A partner-specific offer.',
			'labels'              => $labels,
			'supports'            => array( 'title', 'revisions' ),
			'hierarchical'        => true,
			'public'              => true,
			'show_ui'             => true,
			'show_in_menu'        => false,
			'show_in_admin_bar'   => true,
			'show_in_nav_menus'   => true,
			'can_export'          => true,
			'has_archive'         => false,
			'exclude_from_search' => true,
			'publicly_queryable'  => true,
			'capability_type'     => 'page',
		);
		register_post_type( 'partner_offer', $args );
	}

	/**
	* Create submenus for these content items
	*
	*/
	public function create_sub_menus() {
		$partner = 'edit.php?post_type=partner';
		add_submenu_page( $this->slug, 'Partners', 'Partners', 'manage_options', $partner );
		$partner_offer = 'edit.php?post_type=partner_offer';
		add_submenu_page( $this->slug, 'Partner Offers', 'Partner Offers', 'manage_options', $partner_offer );
	}

	/**
	* Create the partner offer content type
	*
	* @param string $title
	* @return string $title
	*
	*/
	public function title_placeholders( $title ) {
		$screen = get_current_screen();
		if ( 'partner' === $screen->post_type ) {
			$title = __( 'Enter partner name here', 'minnpost-membership' );
		}
		if ( 'partner_offer' === $screen->post_type ) {
			$title = __( 'Enter offer/event name here', 'minnpost-membership' );;
		}
		return $title;
	}

	/**
	* Create the partner fields with CMB2
	*
	*/
	public function create_partner_fields() {

		$object_type = 'partner';
		$prefix      = '_mp_partner_';

		$partner_fields = new_cmb2_box( array(
			'id'           => $prefix . 'partner_fields',
			'title'        => __( 'Partner Fields', 'minnpost-membership' ),
			'object_types' => $object_type,
		) );
		$partner_fields->add_field( array(
			'name' => __( 'Link URL', 'minnpost-membership' ),
			'id'   => $prefix . 'link_url',
			'type' => 'text',
			'desc' => '',
		) );
		$partner_fields->add_field( array(
			'name'         => __( 'Logo Image', 'minnpost-membership' ),
			'desc'         => __( 'Upload an image or enter an URL.', 'minnpost-membership' ),
			'id'           => $prefix . 'logo_image',
			'type'         => 'file',
			'preview_size' => array( 130, 85 ),
			'options'      => array(
				//'url' => false, // Hide the text input for the url
			),
			'text'         => array(
				//'add_upload_file_text' => 'Add Image', // Change upload button text. Default: "Add or Upload File"
			),
			// query_args are passed to wp.media's library query.
			'query_args'   => array(
				'type' => 'image',
			),
		) );
	}

	/**
	* Create the partner offer fields with CMB2
	*
	*/
	public function create_partner_offer_fields() {
		$object_type = 'partner_offer';
		$prefix      = '_mp_partner_offer_';

		// set partner for the partner offer
		remove_meta_box( 'pageparentdiv', $object_type, 'normal' );
		$partner_box = new_cmb2_box( array(
			'id'           => $prefix . 'parent',
			'title'        => 'Partner',
			'object_types' => $object_type,
			'context'      => 'side',
			'priority'     => 'high',
		) );
		// get all partner posts
		$posts = get_posts(
			array(
				'post_type'      => 'partner',
				'posts_per_page' => -1,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);
		$items = array();
		foreach ( $posts as $post ) {
			$items[ $post->ID ] = $post->post_title;
		}
		$partner_box->add_field( array(
			'name'             => '',
			'desc'             => '',
			'id'               => 'partner_id',
			'type'             => 'select',
			'show_option_none' => __( 'Choose Partner', 'minnpost-membership' ),
			'default'          => '',
			'options'          => $items,
			'attributes'       => array(
				'required' => 'required',
			),
		) );

		// set other partner offer fields
		$offer_fields = new_cmb2_box( array(
			'id'           => $prefix . 'offer_fields',
			'title'        => __( 'Offer fields', 'minnpost-membership' ),
			'object_types' => $object_type,
			'context'      => 'normal',
			//'priority'     => 'high',
		) );
		$offer_fields->add_field( array(
			'name'       => __( 'Quantity', 'minnpost-membership' ),
			'desc'       => '',
			'default'    => '',
			'id'         => $prefix . 'quantity',
			'type'       => 'text_small',
			'attributes' => array(),
		) );
		$offer_fields->add_field( array(
			'name'       => __( 'Type', 'minnpost-membership' ),
			'desc'       => '',
			'default'    => '',
			'id'         => $prefix . 'type',
			'type'       => 'text',
			'attributes' => array(),
		) );
		$offer_fields->add_field( array(
			'name'       => __( 'Restriction', 'minnpost-membership' ),
			'desc'       => '',
			'default'    => '',
			'id'         => $prefix . 'restriction',
			'type'       => 'text',
			'attributes' => array(),
		) );
		/*$offer_fields->add_field( array(
			'name'       => __( 'Offer Image', 'minnpost-membership' ),
			'desc'       => __( 'Upload an image or enter an URL.', 'minnpost-membership' ),
			'id'         => $prefix . 'offer_image',
			'type'       => 'file',
			//'preview_size' => array( 130, 85 ),
			'options'    => array(
				//'url' => false, // Hide the text input for the url
			),
			'text'       => array(
				//'add_upload_file_text' => 'Add Image', // Change upload button text. Default: "Add or Upload File"
			),
			// query_args are passed to wp.media's library query.
			'query_args' => array(
				'type' => 'image',
			),
		) );*/

		// set more info partner offer fields
		$more_info_fields = new_cmb2_box( array(
			'id'           => $prefix . 'more_info_fields',
			'title'        => __( 'More info fields', 'minnpost-membership' ),
			'object_types' => $object_type,
			'context'      => 'normal',
			//'priority'     => 'high',
		) );
		$more_info_fields->add_field( array(
			'name'       => __( 'Text', 'minnpost-membership' ),
			'desc'       => '',
			'default'    => '',
			'id'         => $prefix . 'more_info_text',
			'type'       => 'text',
			'attributes' => array(),
		) );
		$more_info_fields->add_field( array(
			'name'       => __( 'URL', 'minnpost-membership' ),
			'desc'       => '',
			'default'    => '',
			'id'         => $prefix . 'more_info_url',
			'type'       => 'text',
			'attributes' => array(),
		) );

		$claimable_dates = new_cmb2_box( array(
			'id'           => $prefix . 'claimable_dates',
			'title'        => __( 'Claimable dates', 'minnpost-membership' ),
			'object_types' => $object_type,
			'context'      => 'normal',
			//'priority'     => 'high',
		) );
		$claimable_dates->add_field( array(
			'name'       => 'Start',
			'desc'       => '',
			'id'         => $prefix . 'claimable_start_date',
			'type'       => 'text_datetime_timestamp',
			'attributes' => array(
				'required' => 'required',
			),
		) );
		$claimable_dates->add_field( array(
			'name' => 'End',
			'desc' => '',
			'id'   => $prefix . 'claimable_end_date',
			'type' => 'text_datetime_timestamp',
		) );

		$instance_box = new_cmb2_box( array(
			'id'           => $prefix . 'instances',
			'title'        => 'Offer instance(s)',
			'object_types' => $object_type,
			'context'      => 'normal',
			//'priority'     => 'high',
		) );

		$instance_box->add_field( array(
			'id'          => $prefix . 'instance',
			'type'        => 'group',
			'description' => '',
			'options'     => array(
				'group_title'   => esc_html__( 'Instance {#}', 'minnpost-membership' ), // {#} gets replaced by row number
				'add_button'    => esc_html__( 'Add Another Instance', 'minnpost-membership' ),
				'remove_button' => esc_html__( 'Remove Instance', 'minnpost-membership' ),
				'sortable'      => true,
				// 'closed'     => true, // true to have the groups closed by default
			),
		) );

		$instance_box->add_group_field( $prefix . 'instance', array(
			'name' => 'Enabled',
			'id'   => $prefix . 'instance_enabled',
			'type' => 'checkbox',
			'desc' => '',
		) );

		$instance_box->add_group_field( $prefix . 'instance', array(
			'name' => esc_html__( 'Instance date', 'minnpost-membership' ),
			'id'   => $prefix . 'instance_date',
			'type' => 'text_datetime_timestamp',
			// 'repeatable' => true, // Repeatable fields are supported w/in repeatable groups (for most types)
		) );

		$instance_box->add_group_field( $prefix . 'instance', array(
			'name' => esc_html__( 'Claimed date', 'minnpost-membership' ),
			'id'   => $prefix . 'claimed_date',
			'type' => 'text_datetime_timestamp',
			// 'repeatable' => true, // Repeatable fields are supported w/in repeatable groups (for most types)
		) );

		$member_levels = $this->member_levels->get_member_levels( '', false );
		foreach ( $member_levels as $member_level ) {
			$roles[] = $member_level['slug'];
		}
		$roles[] = 'administrator';
		$roles[] = 'business';

		$instance_box->add_group_field( $prefix . 'instance', array(
			'name'    => 'Claim user',
			'id'      => $prefix . 'claim_user',
			'desc'    => 'Type the name of the user to set them as the claiming user',
			'type'    => 'user_select_text',
			'options' => array(
				'user_roles' => $roles, // Specify which roles to query for.
			),
		) );

	}

	/**
	* Get all partners
	* @param int $partner_id
	* @return object $partners
	*
	*/
	public function get_partners( $partner_id = '' ) {
		$args = array(
			'posts_per_page' => -1,
			'post_type'      => 'partner',
			'orderby'        => 'title',
			'order'          => 'ASC',
		);
		if ( '' !== $partner_id ) {
			$partner       = get_post( $partner_id );
			$partner->meta = get_post_meta( $partner_id );
			return $partner;
		} else {
			$partners = new WP_Query( $args );
			return $partners;
		}
	}

	/**
	* Display the partner <figure>
	* @param int $partner_id
	* @param string $size
	* @param bool $include_link
	* @param bool $include_name
	*
	*/
	public function partner_figure( $partner_id = '', $size = 'partner-logo', $include_link = true, $include_name = false ) {
		$output = $this->get_partner_figure( $partner_id, $size, $include_link, $include_name );
		echo $output;
	}

	/**
	* Get the partner <figure> html
	* @param int $partner_id
	* @param string $size
	* @param bool $include_link
	* @param bool $include_name
	*
	*/
	public function get_partner_figure( $partner_id = '', $size = 'partner-logo', $include_link = true, $include_name = false ) {

		if ( '' === $partner_id ) {
			$partner_id = get_the_ID();
		}

		$image_data = $this->get_partner_image( $partner_id, $size );
		if ( '' !== $image_data ) {
			$image_id  = $image_data['image_id'];
			$image_url = $image_data['image_url'];
			$image     = $image_data['markup'];
		}

		$link = get_post_meta( $partner_id, '_mp_partner_link_url', true );

		if ( post_password_required() || is_attachment() || ( ! isset( $image_id ) && ! isset( $image_url ) ) ) {
			return;
		}

		$name = '';
		$name = get_the_title( $partner_id );

		$output  = '';
		$output .= '<figure class="a-partner-figure a-partner-figure-' . $size . '">';
		if ( true === $include_link && '' !== $link ) {
			$output .= '<a href="' . $link . '">';
		}
		$output .= $image;
		if ( true === $include_link && '' !== $link ) {
			$output .= '</a>';
		}
		if ( true === $include_name && '' !== $name ) {
			$output .= '<figcaption>';
			if ( true === $include_name && '' !== $name ) {
				$output .= '<h3 class="a-author-title"><a href="' . get_author_posts_url( $author_id, sanitize_title( $name ) ) . '">' . $name . '</a></h3>';
			}
			$output .= $text;
			$output .= '</figcaption>';
		}
		$output .= '</figure><!-- .author-figure -->';
		return $output;
	}

	/**
	* Get the image for the partner
	* @param int $partner_id
	* @param string $size
	*
	*/
	public function get_partner_image( $partner_id, $size = 'partner-logo' ) {
		$image_url = get_post_meta( $partner_id, '_mp_partner_logo_image', true );
		if ( 'partner-logo' !== $size ) {
			$image_url = get_post_meta( $partner_id, '_mp_partner_logo_image' . $size, true );
		}
		$image_id = get_post_meta( $partner_id, '_mp_partner_logo_image_id', true );

		if ( post_password_required() || is_attachment() || ( ! $image_id && ! $image_url ) ) {
			return '';
		}

		if ( '' !== wp_get_attachment_image( $image_id, $size ) ) {
			$image = wp_get_attachment_image( $image_id, $size );
		} else {
			$alt   = get_post_meta( $image_id, '_wp_attachment_image_alt', true );
			$image = '<img src="' . $image_url . '" alt="' . $alt . '">';
		}

		$image = apply_filters( 'easy_lazy_loader_html', $image );

		$image_data = array(
			'image_id'  => $image_id,
			'image_url' => $image_url,
			'markup'    => $image,
		);
		return $image_data;
	}

	/**
	* Get all partner offers
	* @param int $partner_offer_id
	* @return object $partner_offers
	*
	*/
	public function get_partner_offers( $partner_offer_id = '' ) {
		if ( '' !== $partner_offer_id ) {

			global $wpdb;

			$partner_offers = $wpdb->get_results(
				"SELECT
				offer.ID, offer.post_title,
				partner.meta_value as post_parent,
				offer.post_type as post_type,
				partner_image_id.meta_value as partner_logo_image_id, partner_image.meta_value as partner_logo_image,
				partner_link.meta_value as partner_link_url,
				quantity.meta_value as quantity,
				offer_type.meta_value as offer_type,
				restriction.meta_value as restriction,
				more_info_text.meta_value as more_info_text,
				more_info_url.meta_value as more_info_url,
				claimable_start_date.meta_value as claimable_start_date, claimable_end_date.meta_value as claimable_end_date,

				instance.meta_value as instances

				FROM {$wpdb->prefix}posts offer

				LEFT JOIN {$wpdb->prefix}postmeta AS partner ON offer.ID = partner.post_id AND 'partner_id' = partner.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS partner_image_id ON partner.meta_value = partner_image_id.post_id AND '_mp_partner_logo_image_id' = partner_image_id.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS partner_image ON partner.meta_value = partner_image.post_id AND '_mp_partner_logo_image' = partner_image.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS partner_link ON partner.meta_value = partner_link.post_id AND '_mp_partner_link_url' = partner_link.meta_key

				LEFT JOIN {$wpdb->prefix}postmeta AS quantity ON offer.ID = quantity.post_id AND '_mp_partner_offer_quantity' = quantity.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS offer_type ON offer.ID = offer_type.post_id AND '_mp_partner_offer_type' = offer_type.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS restriction ON offer.ID = restriction.post_id AND '_mp_partner_offer_restriction' = restriction.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS more_info_text ON offer.ID = more_info_text.post_id AND '_mp_partner_offer_more_info_text' = more_info_text.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS more_info_url ON offer.ID = more_info_url.post_id AND '_mp_partner_offer_more_info_url' = more_info_url.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS claimable_start_date ON offer.ID = claimable_start_date.post_id AND '_mp_partner_offer_claimable_start_date' = claimable_start_date.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS claimable_end_date ON offer.ID = claimable_end_date.post_id AND '_mp_partner_offer_claimable_end_date' = claimable_end_date.meta_key

				LEFT JOIN {$wpdb->prefix}postmeta AS instance ON offer.ID = instance.post_id AND '_mp_partner_offer_instance' = instance.meta_key

				WHERE offer.post_status = 'publish' AND offer.ID = $partner_offer_id

				#ORDER BY available_instance_count DESC, claimable_start_date DESC, claimable_end_date DESC
				ORDER BY claimable_start_date DESC, claimable_end_date DESC

				", OBJECT
			);

			foreach ( $partner_offers as $partner_offer ) {
				$partner_offer = $this->save_partner_offer_instances( $partner_offer );
			}

			usort( $partner_offers, array( $this, 'sort_partner_offer_instances' ) );

			return $partner_offers[0];

		} else {
			global $wpdb;

			$partner_offers = $wpdb->get_results(
				"SELECT
				offer.ID, offer.post_title,
				partner.meta_value as post_parent,
				offer.post_type as post_type,
				partner_image_id.meta_value as partner_logo_image_id, partner_image.meta_value as partner_logo_image,
				partner_link.meta_value as partner_link_url,
				quantity.meta_value as quantity,
				offer_type.meta_value as offer_type,
				restriction.meta_value as restriction,
				more_info_text.meta_value as more_info_text,
				more_info_url.meta_value as more_info_url,
				claimable_start_date.meta_value as claimable_start_date, claimable_end_date.meta_value as claimable_end_date,

				instance.meta_value as instances

				FROM {$wpdb->prefix}posts offer

				LEFT JOIN {$wpdb->prefix}postmeta AS partner ON offer.ID = partner.post_id AND 'partner_id' = partner.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS partner_image_id ON partner.meta_value = partner_image_id.post_id AND '_mp_partner_logo_image_id' = partner_image_id.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS partner_image ON partner.meta_value = partner_image.post_id AND '_mp_partner_logo_image' = partner_image.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS partner_link ON partner.meta_value = partner_link.post_id AND '_mp_partner_link_url' = partner_link.meta_key

				LEFT JOIN {$wpdb->prefix}postmeta AS quantity ON offer.ID = quantity.post_id AND '_mp_partner_offer_quantity' = quantity.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS offer_type ON offer.ID = offer_type.post_id AND '_mp_partner_offer_type' = offer_type.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS restriction ON offer.ID = restriction.post_id AND '_mp_partner_offer_restriction' = restriction.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS more_info_text ON offer.ID = more_info_text.post_id AND '_mp_partner_offer_more_info_text' = more_info_text.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS more_info_url ON offer.ID = more_info_url.post_id AND '_mp_partner_offer_more_info_url' = more_info_url.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS claimable_start_date ON offer.ID = claimable_start_date.post_id AND '_mp_partner_offer_claimable_start_date' = claimable_start_date.meta_key
				LEFT JOIN {$wpdb->prefix}postmeta AS claimable_end_date ON offer.ID = claimable_end_date.post_id AND '_mp_partner_offer_claimable_end_date' = claimable_end_date.meta_key

				LEFT JOIN {$wpdb->prefix}postmeta AS instance ON offer.ID = instance.post_id AND '_mp_partner_offer_instance' = instance.meta_key

				WHERE offer.post_status = 'publish' AND offer.post_type = 'partner_offer'

				#ORDER BY available_instance_count DESC, claimable_start_date DESC, claimable_end_date DESC
				ORDER BY claimable_start_date DESC, claimable_end_date DESC

				", OBJECT
			);

			foreach ( $partner_offers as $partner_offer ) {
				$partner_offer = $this->save_partner_offer_instances( $partner_offer );
			}

			usort( $partner_offers, array( $this, 'sort_partner_offer_instances' ) );

			return $partner_offers;
		}
	}

	/**
	* Save partner offer instances to the partner offer object
	*
	* @param object $partner_offer
	* @return object $partner_offer
	*
	*/
	private function save_partner_offer_instances( $partner_offer ) {
		$unclaimed_instance_count = 0;

		if ( null !== $partner_offer->instances ) {
			$instances = maybe_unserialize( $partner_offer->instances );
			if ( is_array( $instances ) ) {
				foreach ( $instances as $key => $instance ) {
					if ( ! isset( $instance['_mp_partner_offer_instance_enabled'] ) || 'on' !== $instance['_mp_partner_offer_instance_enabled'] ) {
						continue;
					}
					if ( isset( $instance['_mp_partner_offer_claimed_date'] ) && '' !== $instance['_mp_partner_offer_claimed_date'] ) {
						continue;
					}
					$unclaimed_instance_count++;
				}
			}
			$partner_offer->unclaimed_instance_count = $unclaimed_instance_count;
		} else {
			$partner_offer->unclaimed_instance_count = $unclaimed_instance_count;
		}
		$partner_offer->instances = $instances;

		return $partner_offer;
	}

	/**
	* Sort partner offer instances by instance count
	*
	* @param object $a
	* @param object $b
	* @param array
	*
	*/
	private function sort_partner_offer_instances( $a, $b ) {
		return strcmp( $b->unclaimed_instance_count, $a->unclaimed_instance_count );
	}

	/**
	* Output partner offer image
	*
	* @param int $id
	* @param array $attributes
	* @param bool $lazy_load
	*
	*/
	public function partner_offer_image( $id, $attributes = array(), $lazy_load = true ) {
		$image_data = $this->get_partner_offer_image( $id, $attributes, $lazy_load );
		if ( '' !== $image_data ) {
			$image_id  = $image_data['image_id'];
			$image_url = $image_data['image_url'];
			$image     = $image_data['markup'];
		}

		if ( post_password_required() || is_attachment() || ( ! isset( $image_id ) && ! isset( $image_url ) ) ) {
			return;
		}

		if ( true === $lazy_load ) {
			$image = apply_filters( 'easy_lazy_loader_html', $image );
		}

		$caption = wp_get_attachment_caption( $image_id );
		$credit  = get_media_credit_html( $image_id, false ); // don't show the uploader by default
		?>
		<figure class="m-partner-offer-image">
			<?php echo $image; ?>
			<?php if ( '' !== $caption || '' !== $credit ) { ?>
			<figcaption>
				<?php if ( '' !== $credit ) { ?>
					<div class="a-media-meta a-media-credit"><?php echo $credit; ?></div>
				<?php } ?>
				<?php if ( '' !== $caption ) { ?>
					<div class="a-media-meta a-media-caption"><?php echo $caption; ?></div>
				<?php } ?>
			</figcaption>
			<?php } ?>
		</figure><!-- .post-image -->
		<?php
	}


	/**
	* Get the partner offer image based on where it should go
	*
	* @param int $id
	* @param array $attributes
	* @param bool $lazy_load
	*
	* @return array $image_data
	*
	*/
	public function get_partner_offer_image( $id, $attributes = array(), $lazy_load = true ) {

		$image_url = get_post_meta( $id, '_mp_partner_logo_image', true );
		$image_id  = get_post_meta( $id, '_mp_partner_logo_image_id', true );

		if ( '' !== wp_get_attachment_image( $image_id, 'full' ) ) {
			// this requires that the custom image sizes in custom-fields.php work correctly
			$image = wp_get_attachment_image( $image_id, 'full' );
		} else {
			if ( '' !== $image_id ) {
				$alt = get_post_meta( $image_id, '_wp_attachment_image_alt', true );
			} else {
				$alt = '';
			}
			$image = '<img src="' . $image_url . '" alt="' . $alt . '">';
		}

		if ( post_password_required() || is_attachment() || ( '' === $image_id && '' === $image_url ) ) {
			return;
		}

		if ( true === $lazy_load ) {
			$image = apply_filters( 'easy_lazy_loader_html', $image );
		}

		$image_data = array(
			'image_id'  => $image_id,
			'image_url' => $image_url,
			'markup'    => $image,
		);
		return $image_data;
	}

	/**
	* Get content for partner offer that changes based on its claim/availability/etc status
	* @param int $unclaimed_instance_count
	* @param array $instances
	* @return array $offer_status
	*
	*/
	public function get_partner_offer_status_content( $unclaimed_instance_count, $instances ) {
		$offer_status_content = array(
			'current_status' => 'closed',
			'button_class'   => '',
			'button_attr'    => '',
			'button_value'   => '', // value should come from plugin options
			'button_label'   => '', // value should come from plugin options
			'message'        => '', // value should come from plugin options
		);

		// regardless of what the user did, something will display for these things
		if ( 0 < $unclaimed_instance_count ) {
			$offer_status_content['current_status'] = 'open';
			$offer_status_content['button_value']   = get_the_ID();
			$offer_status_content['button_label']   = 'Claim Now'; // value should come from plugin options
		} else {
			$offer_status_content['button_value'] = 'claimed';
			$offer_status_content['button_class'] = ' a-button-disabled';
			$offer_status_content['button_attr']  = ' disabled="disabled"';
			$offer_status_content['button_label'] = 'All Claimed'; // value should come from plugin options
		}

		// if user successfully made a claim, show them
		if ( isset( $_GET['claimed'] ) ) {
			$claimed = filter_var( $_GET['claimed'], FILTER_SANITIZE_STRING );
			if ( get_the_ID() === (int) $_GET['claimed'] ) {
				$offer_status_content['current_status'] = 'success';
				$offer_status_content['message']        = 'You have successfully claimed this offer. You will receive an email with further details shortly.'; // value should come from plugin options
				return $offer_status_content;
			} // if the ids don't match, it's not the offer the user claimed
		}

		// if user tried to claim but it failed, show them
		if ( isset( $_GET['not-claimed'] ) ) {
			echo 'count is ' . $unclaimed_instance_count;
		}

		return $offer_status_content;
	}

}

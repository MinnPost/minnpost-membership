;(function($) {
"use strict";

;

(function (window) {
  function MinnPostMembership(data, settings) {
    this.data = {};

    if (typeof data !== 'undefined') {
      this.data = data;
    }

    this.settings = {};

    if (typeof settings !== 'undefined') {
      this.settings = settings;
    }

    this.previousAmount = '';

    if (typeof this.data.current_user !== 'undefined' && typeof this.data.current_user.previous_amount !== 'undefined') {
      this.previousAmount = this.data.current_user.previous_amount;
    }
  }

  MinnPostMembership.prototype = {
    checkLevel: function (amount, frequency, type) {
      var thisyear = parseInt(amount) * parseInt(frequency);

      if (typeof this.previousAmount !== 'undefined' && this.previousAmount !== '') {
        var prior_year_amount = parseInt(this.previousAmount.prior_year_contributions, 10);
        var coming_year_amount = parseInt(this.previousAmount.coming_year_contributions, 10);
        var annual_recurring_amount = parseInt(this.previousAmount.annual_recurring_amount, 10); // calculate member level formula

        if (type === 'one-time') {
          prior_year_amount += thisyear;
        } else {
          annual_recurring_amount += thisyear;
        }

        thisyear = Math.max(prior_year_amount, coming_year_amount, annual_recurring_amount);
      }

      return this.getLevel(thisyear);
    },
    // end checkLevel
    getLevel: function (thisyear) {
      var level = {
        'yearlyAmount': thisyear
      };

      if (thisyear > 0 && thisyear < 60) {
        level['name'] = 'Bronze';
        level['number'] = 1;
      } else if (thisyear > 59 && thisyear < 120) {
        level['name'] = 'Silver';
        level['number'] = 2;
      } else if (thisyear > 119 && thisyear < 240) {
        level['name'] = 'Gold';
        level['number'] = 3;
      } else if (thisyear > 239) {
        level['name'] = 'Platinum';
        level['number'] = 4;
      }

      return level;
    } // end getLevel

  };
  window.MinnPostMembership = new MinnPostMembership(window.minnpost_membership_data, window.minnpost_membership_settings);
})(window);
"use strict";

// plugin
;

(function ($, window, document, MinnPostMembership) {
  // Create the defaults once
  var pluginName = 'minnpostAmountSelect',
      defaults = {
    frequencySelector: '.m-frequency-select input[type="radio"]',
    amountGroup: '.m-frequency-group',
    amountSelector: '.m-amount-select input[type="radio"]',
    amountLabels: '.m-amount-select label',
    amountValue: 'strong',
    amountDescription: '.a-amount-description',
    amountField: '.a-amount-field #amount',
    customAmountFrequency: '#amount-item .a-frequency-text-label',
    levelViewer: '.a-show-level',
    levelName: '.a-level',
    userCurrentLevel: '.a-current-level',
    declineBenefits: '.m-decline-benefits-select input[type="radio"]',
    giftSelectionGroup: '.m-membership-gift-selector',
    giftLevel: '.m-gift-level',
    giftSelector: '.m-gift-level .m-form-item input[type="radio"]',
    giftLabel: '.m-gift-level .m-form-item input[type="radio"] + label',
    swagEligibilityText: '.m-membership-gift-selector .swag-eligibility',
    swagSelector: '.m-select-swag input[type="radio"]',
    swagLabels: '.m-select-swag input[type="radio"] + label',
    minAmounts: '.m-membership-gift-selector .min-amount',
    declineGiftLevel: '.m-decline-level'
  }; // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function () {
      var $frequency = $(this.element).find(this.options.frequencySelector);
      var $form = $(this.element);
      var $suggestedAmount = $(this.options.amountSelector);
      var $amount = $(this.element).find(this.options.amountField);
      var $declineBenefits = $(this.element).find(this.options.declineBenefits);
      var $gifts = $(this.element).find(this.options.giftSelector);

      if (!($amount.length > 0 && $frequency.length > 0 && $suggestedAmount.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      this.setAmountLabels($frequency.filter(':checked').val());
      this.setMinAmounts($frequency.filter(':checked').val());
      this.checkAndSetLevel(false);
      $frequency.on('change', this.onFrequencyChange.bind(this));
      $suggestedAmount.on('change', this.onSuggestedAmountChange.bind(this));
      $amount.on('keyup mouseup', this.onAmountChange.bind(this));

      if (!($declineBenefits.length > 0 && $gifts.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      if ($gifts.not(this.options.declineGiftLevel).is(':checked')) {
        $(this.element).find(this.options.declineGiftLevel).prop('checked', false);
      }

      this.onDeclineBenefitsChange();
      this.setRequiredFields($gifts);
      $declineBenefits.on('change', this.onDeclineBenefitsChange.bind(this));
      $gifts.on('click', this.onGiftsClick.bind(this)); // when the form is submitted

      document.querySelectorAll(".m-form-membership").forEach(membershipForm => membershipForm.addEventListener("submit", event => {
        this.onFormSubmit(event);
      }));
    },
    // end init

    /*
     * run an analytics product action
    */
    analyticsProductAction: function (level, amount, frequency_label, action, step) {
      var product = this.analyticsProduct(level, amount, frequency_label);
      wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', action, product, step);
    },
    // end analyticsProductAction

    /*
      * create an analytics product variable
     */
    analyticsProduct: function (level, amount, frequency_label) {
      let product = {
        'id': 'minnpost_' + level.toLowerCase() + '_membership',
        'name': 'MinnPost ' + level.charAt(0).toUpperCase() + level.slice(1) + ' Membership',
        'category': 'Donation',
        'brand': 'MinnPost',
        'variant': frequency_label,
        'price': amount,
        'quantity': 1
      };
      return product;
    },
    // end analyticsProduct
    onFrequencyChange: function (event) {
      this.setAmountLabels($(event.target).val());
      this.setMinAmounts($(event.target).val());
      this.checkAndSetLevel(true);
    },
    // end onFrequencyChange
    onSuggestedAmountChange: function (event) {
      $(this.element).find(this.options.amountField).val(null);
      this.checkAndSetLevel(true);
    },
    // end onSuggestedAmountChange
    onAmountChange: function (event) {
      this.clearAmountSelector(event);
      var $target = $(event.target);

      if ($target.data('last-value') != $target.val()) {
        $target.data('last-value', $target.val());
        this.checkAndSetLevel(true);
      }
    },
    // end onAmountChange
    onDeclineBenefitsChange: function (event) {
      var $giftSelectionGroup = $(this.element).find(this.options.giftSelectionGroup);
      var decline = $(this.element).find(this.options.declineBenefits).filter(':checked').val();

      if (decline === 'true') {
        $giftSelectionGroup.hide();
        return;
      }

      $giftSelectionGroup.show();
    },
    // end onDeclineBenefitsChange
    onGiftsClick: function (event) {
      var $gifts = $(this.element).find(this.options.giftSelector).not(this.options.declineGiftLevel);
      var $decline = $(this.element).find(this.options.declineGiftLevel);

      if ($(event.target).is(this.options.declineGiftLevel)) {
        $gifts.prop('checked', false);
        return;
      }

      this.setRequiredFields($gifts);
      $decline.prop('checked', false);
    },
    // end onGiftsClick
    setRequiredFields: function ($gifts) {
      var $checkedGifts = $gifts.filter(':checked');

      if ($checkedGifts) {
        var that = this;
        $("[data-required='true']").prop('required', false);
        $checkedGifts.each(function () {
          var setRequired = function () {
            $(this).prop('required', true);
          };

          $("[data-required='true']", $(this).parent()).each(setRequired);
        });
      }
    },
    // end setRequiredFields
    onFormSubmit: function (event) {
      var amount = $(this.options.amountSelector).filter(':checked').val();

      if (typeof amount === 'undefined') {
        amount = $(this.options.amountField).val();
      }

      var frequency_string = $(this.options.frequencySelector + ':checked').val();
      var frequency = frequency_string.split(' - ')[1];
      var frequency_name = frequency_string.split(' - ')[0];
      var frequency_id = $(this.options.frequencySelector + ':checked').prop('id');
      var frequency_label = $('label[for="' + frequency_id + '"]').text();
      var level = MinnPostMembership.checkLevel(amount, frequency, frequency_name);
      var options = {
        type: 'event',
        category: 'Support Us',
        action: 'Become A Member',
        label: location.pathname
      }; // this tracks an event submission based on the plugin options
      // it also bubbles the event up to submit the form

      wp.hooks.doAction('minnpostMembershipAnalyticsEvent', options.type, options.category, options.action, options.label);
      var hasClass = event.target.classList.contains("m-form-membership-support"); // if this is the main checkout form, send it to the ec plugin as a checkout

      if (hasClass) {
        var product = this.analyticsProduct(level['name'], amount, frequency_label);
        wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'add_to_cart', product);
        wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'begin_checkout', product);
      }
    },
    // end onFormSubmit
    clearAmountSelector: function (event) {
      var $suggestedAmount = $(this.options.amountSelector);

      if ($(event.target).val() === '') {
        return;
      }

      $suggestedAmount.prop('checked', false);
    },
    // end clearAmountSelector
    setAmountLabels: function (frequencyString) {
      var $groups = $(this.options.amountGroup);
      var $selected = $(this.options.amountSelector).filter(':checked');
      var index = $selected.data('index');
      var $customAmountFrequency = $(this.options.customAmountFrequency);
      $groups.removeClass('active');
      $groups.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
      $selected.prop('checked', false);
      $groups.filter('.active').find('input[type="radio"][data-index="' + index + '"]').prop('checked', true);
      var currentFrequencyLabel = $groups.filter('.active').find('.a-frequency-text-label').first().text();
      $customAmountFrequency.text(currentFrequencyLabel);
    },
    // end setAmountLabels
    setMinAmounts: function (frequencyString) {
      var $elements = $(this.options.minAmounts);
      $elements.removeClass('active');
      $elements.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
    },
    // end setMinAmounts
    checkAndSetLevel: function (updated) {
      var amount = $(this.options.amountSelector).filter(':checked').val();

      if (typeof amount === 'undefined') {
        amount = $(this.options.amountField).val();
      }

      var frequency_string = $(this.options.frequencySelector + ':checked').val();
      var frequency = frequency_string.split(' - ')[1];
      var frequency_name = frequency_string.split(' - ')[0];
      var frequency_id = $(this.options.frequencySelector + ':checked').prop('id');
      var frequency_label = $('label[for="' + frequency_id + '"]').text();
      var level = MinnPostMembership.checkLevel(amount, frequency, frequency_name);
      this.showNewLevel(this.element, this.options, level);
      this.setEnabledGifts(level);
      this.analyticsProductAction(level['name'], amount, frequency_label, 'select_content', 1);
    },
    // end checkAndSetLevel
    showNewLevel: function (element, options, level) {
      var member_level_prefix = '';
      var old_level = '';
      var levelViewerContainer = options.levelViewer; // this should change when we replace the text, if there is a link inside it

      var decodeHtmlEntity = function (str) {
        return str.replace(/&#(\d+);/g, function (match, dec) {
          return String.fromCharCode(dec);
        });
      };

      if (typeof minnpost_membership_data !== 'undefined') {
        member_level_prefix = minnpost_membership_data.member_level_prefix;
      }

      if ($(options.levelViewer).length > 0) {
        $(options.levelViewer).prop('class', 'a-show-level a-show-level-' + level['name'].toLowerCase());

        if ($(options.userCurrentLevel).length > 0 && minnpost_membership_data.current_user.member_level.length > 0) {
          if ('a', $(options.levelViewer).length > 0) {
            levelViewerContainer = options.levelViewer + ' a';
          }

          old_level = minnpost_membership_data.current_user.member_level.replace(member_level_prefix, '');

          if (old_level !== level['name'].toLowerCase()) {
            $(levelViewerContainer).html(decodeHtmlEntity($(options.levelViewer).data('changed')));
          } else {
            $(levelViewerContainer).html(decodeHtmlEntity($(options.levelViewer).data('not-changed')));
          }
        }

        $(options.levelName, options.levelViewer).text(level['name']);
      }
    },
    // end showNewLevel
    setEnabledGifts: function (level) {
      var setEnabled = function () {
        $(this).prop('disabled', level.yearlyAmount < $(this).data('minYearlyAmount'));
      };

      $(this.options.giftSelector).each(setEnabled);

      if ($(this.options.swagSelector).not('#swag-decline').is(':enabled')) {
        $('.swag-disabled').removeClass('active');
        $('.swag-enabled').addClass('active');
      } else {
        $('.swag-disabled').addClass('active');
        $('.swag-enabled').removeClass('active');
      }
    } // end setEnabledGifts

  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document, MinnPostMembership);
"use strict";

(function ($) {
  function benefitForm() {
    if (2 === performance.navigation.type) {
      location.reload(true);
    }

    $('.a-benefit-button.a-button-disabled').removeAttr('disabled');
    $('.a-benefit-button').click(function (event) {
      event.preventDefault();
      var $button = $(this);
      var $status = $('.m-benefit-message', $(this).parent());
      var $select = $('select', $(this).parent());
      var settings = minnpost_membership_settings; // reset the message for current status

      if (!'.m-benefit-message-success') {
        $('.m-benefit-message').removeClass('m-benefit-message-visible m-benefit-message-error m-benefit-message-info');
      } // set button to processing


      $button.text('Processing').addClass('a-button-disabled'); // disable all the other buttons

      $('.a-benefit-button').addClass('a-button-disabled'); // set ajax data

      var data = {};
      var benefitType = $('input[name="benefit-name"]').val();

      if ('partner-offers' === benefitType) {
        data = {
          'action': 'benefit_form_submit',
          'minnpost_membership_benefit_form_nonce': $button.data('benefit-nonce'),
          'current_url': $('input[name="current_url"]').val(),
          'benefit-name': $('input[name="benefit-name"]').val(),
          'instance_id': $('[name="instance-id-' + $button.val() + '"]').val(),
          'post_id': $button.val(),
          'is_ajax': '1'
        };
        $.post(settings.ajaxurl, data, function (response) {
          // success
          if (true === response.success) {
            //console.dir(response);
            $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);

            if (0 < $select.length) {
              $select.prop('disabled', true);
            }

            $('.a-benefit-button').not($button).val(response.data.button_value).attr('disabled', true);
          } else {
            // error
            //console.dir(response);
            if ('undefined' === typeof response.data.remove_instance_value) {
              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } else {
              $('option', $select).each(function (i) {
                if ($(this).val() === response.data.remove_instance_value) {
                  $(this).remove();
                }
              });

              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } // re-enable all the other buttons


            $('.a-benefit-button').not($button).removeClass('a-button-disabled');
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
          }
        });
      }
    });
  }

  $(document).ready(function () {
    if (0 < $('.m-form-membership-benefit').length) {
      benefitForm();
    }

    $('.a-refresh-page').on('click', function (event) {
      event.preventDefault();
      location.reload();
    });
  });
})(jQuery);
"use strict";

const button = document.querySelector('.m-support-cta-top .a-support-button');

if (button) {
  button.addEventListener('click', function (event) {
    var value = '';
    const svg = button.querySelector('svg');

    if (null !== svg) {
      let attribute = svg.getAttribute('title');

      if (null !== attribute) {
        value = attribute + ' ';
      }
    }

    value = value + button.textContent;
    wp.hooks.doAction('minnpostMembershipAnalyticsEvent', 'event', 'Support CTA - Header', 'Click: ' + value, location.pathname);
  });
}
"use strict";

// plugin
;

(function ($, window, document, MinnPostMembership, undefined) {
  // Create the defaults once
  var pluginName = 'minnpostMembership',
      defaults = {
    'debug': false,
    // this can be set to true on page level options
    'amount_viewer': '.amount h3',
    'frequency_selector_in_levels': '.a-form-item-membership-frequency',
    'frequency_selector_in_levels_type': 'select',
    'levels_container': '.o-membership-member-levels',
    'single_level_container': '.m-membership-member-level',
    'single_level_summary_selector': '.m-member-level-brief',
    'flipped_items': 'div.amount, div.enter',
    'level_frequency_text_selector': '.show-frequency',
    'choose_amount_selector_in_levels': '.amount .a-button-flip',
    'amount_selector_in_levels': '.enter input.amount-entry'
  }; // end defaults
  // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function (reset, amount) {
      // Place initialization logic here
      // You already have access to the DOM element and
      // the options via the instance, e.g. this.element
      // and this.options
      // you can add more functions like the one below and
      // call them like so: this.yourOtherFunction(this.element, this.options).
      this.catchHashLinks(this.element, this.options);
      this.levelFlipper(this.element, this.options);
      this.startLevelClick(this.element, this.options);
    },
    catchHashLinks: function (element, options) {
      $('a[href*="#"]:not([href="#"])', element).click(function (e) {
        var target = $(e.target);

        if (target.parent('.comment-title').length == 0 && location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
          var target = $(this.hash);
          target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');

          if (target.length) {
            $('html,body').animate({
              scrollTop: target.offset().top
            }, 1000);
            return false;
          }
        }
      });
    },
    // end catchLinks
    levelFlipper: function (element, options) {
      var that = this;
      var amount = 0;
      var level = '';
      var level_number = 0;
      var frequency_string = '';
      var frequency = '';
      var frequency_name = '';

      if ($(options.levels_container).length > 0) {
        $(options.single_level_summary_selector, element).each(function () {
          $(options.flipped_items, $(this)).wrapAll('<div class="flipper"/>');
        });
        $(options.frequency_selector_in_levels, element).on('change', function (event) {
          level_number = $(this).data('member-level-number');
          frequency_string = $(this).val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];

          if (typeof level_number !== 'undefined') {
            $(options.single_level_summary_selector, element).removeClass('flipped');
            $(options.single_level_container, element).removeClass('active');
            $(event.target).closest(options.single_level_summary_selector).addClass('flipped');

            if (frequency == 1) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-yearly'));
            } else if (frequency == 12) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-monthly'));
            }

            amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
            level = that.checkLevel(amount, frequency, frequency_name, element, options);
            that.changeFrequency(frequency_string, level['name'], element, options);
          } else if ($(options.level_frequency_text_selector).length > 0) {
            $(options.level_frequency_text_selector, element).text(frequency_name);
            $(options.single_level_container).each(function () {
              level_number = $(options.amount_selector_in_levels, $(this)).data('member-level-number');

              if (typeof level_number !== 'undefined') {
                amount = $(options.amount_selector_in_levels, $(this)).val();
                level = that.checkLevel(amount, frequency, frequency_name, element, options);
              }
            });
          }

          that.changeAmountPreview(frequency_string, level['name'], element, options);
        });
      }

      if ($(options.choose_amount_selector_in_levels).length > 0) {
        $(options.choose_amount_selector_in_levels, element).click(function (event) {
          level_number = $(options.frequency_selector_in_levels, element).data('member-level-number');
          $(options.single_level_summary_selector, element).removeClass('flipped');
          $(options.single_level_container, element).removeClass('active');
          $(event.target).closest(options.single_level_summary_selector).addClass('flipped');
          frequency_string = $(options.frequency_selector_in_levels, $(this).parent()).val();
          frequency = frequency_string.split(' - ')[1];
          amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
          level = that.checkLevel(amount, frequency, frequency_name, element, options);
          event.preventDefault();
        });
      }
    },
    // end levelFlipper
    checkLevel: function (amount, frequency, type, element, options) {
      var level = MinnPostMembership.checkLevel(amount, frequency, type);
      $('h2', options.single_level_summary_selector).each(function () {
        if ($(this).text() == level['name']) {
          $(options.single_level_container, element).removeClass('active');
          $(this).parent().parent().addClass('active');
        }
      });
      return level;
    },
    // end checkLevel
    changeFrequency: function (selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        var range = $(options.amount_viewer, $(this)).text();
        var month_value = $(options.amount_viewer, $(this)).data('month');
        var year_value = $(options.amount_viewer, $(this)).data('year');
        var once_value = $(options.amount_viewer, $(this)).data('one-time');
        var frequency_name = selected.split(' - ')[0];
        var frequency = parseInt(selected.split(' - ')[1]);
        $(options.frequency_selector_in_levels).val(selected);
        $(options.frequency_selector_in_levels).prop('selected', selected);

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
        $(options.frequency_selector_in_levels, $(this)).data('frequency', frequency);
      });
    },
    // end changeFrequency
    changeAmountPreview: function (selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        var range = $(options.amount_viewer, $(this)).text();
        var month_value = $(options.amount_viewer, $(this)).data('month');
        var year_value = $(options.amount_viewer, $(this)).data('year');
        var once_value = $(options.amount_viewer, $(this)).data('one-time');
        var frequency_name = selected.split(' - ')[0];

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
      });
    },
    // end changeAmountPreview
    startLevelClick: function (element, options) {
      $('.start-level').click(function () {
        var level_class = $(this).prop('class');
        var level_number = level_class[level_class.length - 1];
        $(options.single_level_summary_selector, element).removeClass('flipped');
        $(options.single_level_container, element).removeClass('active');
        $(options.single_level_container + '-' + level_number, element).addClass('active');
        $(options.single_level_container + '-' + level_number + ' ' + options.single_level_summary_selector).addClass('flipped');
      });
    } // end startLevelClick

  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document, MinnPostMembership);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJjdXN0b21BbW91bnRGcmVxdWVuY3kiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJkZWNsaW5lQmVuZWZpdHMiLCJnaWZ0U2VsZWN0aW9uR3JvdXAiLCJnaWZ0TGV2ZWwiLCJnaWZ0U2VsZWN0b3IiLCJnaWZ0TGFiZWwiLCJzd2FnRWxpZ2liaWxpdHlUZXh0Iiwic3dhZ1NlbGVjdG9yIiwic3dhZ0xhYmVscyIsIm1pbkFtb3VudHMiLCJkZWNsaW5lR2lmdExldmVsIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCIkZnJlcXVlbmN5IiwiZmluZCIsIiRmb3JtIiwiJHN1Z2dlc3RlZEFtb3VudCIsIiRhbW91bnQiLCIkZGVjbGluZUJlbmVmaXRzIiwiJGdpZnRzIiwibGVuZ3RoIiwic2V0QW1vdW50TGFiZWxzIiwiZmlsdGVyIiwidmFsIiwic2V0TWluQW1vdW50cyIsImNoZWNrQW5kU2V0TGV2ZWwiLCJvbiIsIm9uRnJlcXVlbmN5Q2hhbmdlIiwiYmluZCIsIm9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlIiwib25BbW91bnRDaGFuZ2UiLCJub3QiLCJpcyIsInByb3AiLCJvbkRlY2xpbmVCZW5lZml0c0NoYW5nZSIsInNldFJlcXVpcmVkRmllbGRzIiwib25HaWZ0c0NsaWNrIiwicXVlcnlTZWxlY3RvckFsbCIsImZvckVhY2giLCJtZW1iZXJzaGlwRm9ybSIsImFkZEV2ZW50TGlzdGVuZXIiLCJldmVudCIsIm9uRm9ybVN1Ym1pdCIsImFuYWx5dGljc1Byb2R1Y3RBY3Rpb24iLCJmcmVxdWVuY3lfbGFiZWwiLCJhY3Rpb24iLCJzdGVwIiwicHJvZHVjdCIsImFuYWx5dGljc1Byb2R1Y3QiLCJ3cCIsImhvb2tzIiwiZG9BY3Rpb24iLCJ0b0xvd2VyQ2FzZSIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJ0YXJnZXQiLCJjbGVhckFtb3VudFNlbGVjdG9yIiwiJHRhcmdldCIsIiRnaWZ0U2VsZWN0aW9uR3JvdXAiLCJkZWNsaW5lIiwiaGlkZSIsInNob3ciLCIkZGVjbGluZSIsIiRjaGVja2VkR2lmdHMiLCJ0aGF0IiwiZWFjaCIsInNldFJlcXVpcmVkIiwicGFyZW50IiwiZnJlcXVlbmN5X3N0cmluZyIsInNwbGl0IiwiZnJlcXVlbmN5X25hbWUiLCJmcmVxdWVuY3lfaWQiLCJ0ZXh0IiwiY2F0ZWdvcnkiLCJsYWJlbCIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJoYXNDbGFzcyIsImNsYXNzTGlzdCIsImNvbnRhaW5zIiwiZnJlcXVlbmN5U3RyaW5nIiwiJGdyb3VwcyIsIiRzZWxlY3RlZCIsImluZGV4IiwiJGN1c3RvbUFtb3VudEZyZXF1ZW5jeSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJjdXJyZW50RnJlcXVlbmN5TGFiZWwiLCJmaXJzdCIsIiRlbGVtZW50cyIsInVwZGF0ZWQiLCJzaG93TmV3TGV2ZWwiLCJzZXRFbmFibGVkR2lmdHMiLCJtZW1iZXJfbGV2ZWxfcHJlZml4Iiwib2xkX2xldmVsIiwibGV2ZWxWaWV3ZXJDb250YWluZXIiLCJkZWNvZGVIdG1sRW50aXR5Iiwic3RyIiwicmVwbGFjZSIsIm1hdGNoIiwiZGVjIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwibWVtYmVyX2xldmVsIiwiaHRtbCIsInNldEVuYWJsZWQiLCJ5ZWFybHlBbW91bnQiLCJmbiIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwicmVsb2FkIiwicmVtb3ZlQXR0ciIsImNsaWNrIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwiJHN0YXR1cyIsIiRzZWxlY3QiLCJiZW5lZml0VHlwZSIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwiYnV0dG9uX2F0dHIiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJidXR0b24iLCJxdWVyeVNlbGVjdG9yIiwidmFsdWUiLCJzdmciLCJhdHRyaWJ1dGUiLCJnZXRBdHRyaWJ1dGUiLCJ0ZXh0Q29udGVudCIsInVuZGVmaW5lZCIsInJlc2V0IiwiY2F0Y2hIYXNoTGlua3MiLCJsZXZlbEZsaXBwZXIiLCJzdGFydExldmVsQ2xpY2siLCJlIiwiaG9zdG5hbWUiLCJoYXNoIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsIm9mZnNldCIsInRvcCIsImxldmVsX251bWJlciIsImxldmVsc19jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciIsImZsaXBwZWRfaXRlbXMiLCJ3cmFwQWxsIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJjbG9zZXN0IiwiYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsImFtb3VudF92aWV3ZXIiLCJjaGFuZ2VGcmVxdWVuY3kiLCJsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciIsImNoYW5nZUFtb3VudFByZXZpZXciLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwibGV2ZWxfY2xhc3MiXSwibWFwcGluZ3MiOiI7O0FBQUE7O0FBQUMsQ0FBQyxVQUFXQSxNQUFYLEVBQW9CO0VBQ3JCLFNBQVNDLGtCQUFULENBQTZCQyxJQUE3QixFQUFtQ0MsUUFBbkMsRUFBOEM7SUFDN0MsS0FBS0QsSUFBTCxHQUFZLEVBQVo7O0lBQ0EsSUFBSSxPQUFPQSxJQUFQLEtBQWdCLFdBQXBCLEVBQWlDO01BQ2hDLEtBQUtBLElBQUwsR0FBWUEsSUFBWjtJQUNBOztJQUVELEtBQUtDLFFBQUwsR0FBZ0IsRUFBaEI7O0lBQ0EsSUFBSSxPQUFPQSxRQUFQLEtBQW9CLFdBQXhCLEVBQXFDO01BQ3BDLEtBQUtBLFFBQUwsR0FBZ0JBLFFBQWhCO0lBQ0E7O0lBRUQsS0FBS0MsY0FBTCxHQUFzQixFQUF0Qjs7SUFDQSxJQUFLLE9BQU8sS0FBS0YsSUFBTCxDQUFVRyxZQUFqQixLQUFrQyxXQUFsQyxJQUNBLE9BQU8sS0FBS0gsSUFBTCxDQUFVRyxZQUFWLENBQXVCQyxlQUE5QixLQUFrRCxXQUR2RCxFQUNxRTtNQUNwRSxLQUFLRixjQUFMLEdBQXNCLEtBQUtGLElBQUwsQ0FBVUcsWUFBVixDQUF1QkMsZUFBN0M7SUFDQTtFQUNEOztFQUVE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c0NvbnRlbnQiOlsiOyhmdW5jdGlvbiAoIHdpbmRvdyApIHtcblx0ZnVuY3Rpb24gTWlublBvc3RNZW1iZXJzaGlwKCBkYXRhLCBzZXR0aW5ncyApIHtcblx0XHR0aGlzLmRhdGEgPSB7fTtcblx0XHRpZiAodHlwZW9mIGRhdGEgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLmRhdGEgPSBkYXRhO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0dGluZ3MgPSB7fTtcblx0XHRpZiAodHlwZW9mIHNldHRpbmdzICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdH1cblxuXHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSAnJztcblx0XHRpZiAoIHR5cGVvZiB0aGlzLmRhdGEuY3VycmVudF91c2VyICE9PSAndW5kZWZpbmVkJyAmJlxuXHRcdCAgICAgdHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50ICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHR9XG5cdH1cblxuXHRNaW5uUG9zdE1lbWJlcnNoaXAucHJvdG90eXBlID0ge1xuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSApIHtcblx0XHRcdHZhciB0aGlzeWVhciA9IHBhcnNlSW50KCBhbW91bnQgKSAqIHBhcnNlSW50KCBmcmVxdWVuY3kgKTtcblx0XHRcdGlmICggdHlwZW9mIHRoaXMucHJldmlvdXNBbW91bnQgIT09ICd1bmRlZmluZWQnICYmIHRoaXMucHJldmlvdXNBbW91bnQgIT09ICcnICkge1xuXHRcdFx0XHR2YXIgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMsIDEwICk7XG5cdFx0XHRcdHZhciBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zLCAxMCApO1xuXHRcdFx0XHR2YXIgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCwgMTAgKTtcblx0XHRcdFx0Ly8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0XHRcdGlmICggdHlwZSA9PT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXN5ZWFyID0gTWF0aC5tYXgoIHByaW9yX3llYXJfYW1vdW50LCBjb21pbmdfeWVhcl9hbW91bnQsIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0aGlzLmdldExldmVsKCB0aGlzeWVhciApO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbDogZnVuY3Rpb24oIHRoaXN5ZWFyICkge1xuXHRcdFx0dmFyIGxldmVsID0ge1xuXHRcdFx0XHQneWVhcmx5QW1vdW50JzogdGhpc3llYXJcblx0XHRcdH07XG5cdFx0XHRpZiAoIHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwICkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cdH07XG5cblx0d2luZG93Lk1pbm5Qb3N0TWVtYmVyc2hpcCA9IG5ldyBNaW5uUG9zdE1lbWJlcnNoaXAoXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSxcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5nc1xuXHQpO1xufSkoIHdpbmRvdyApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RBbW91bnRTZWxlY3QnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHRmcmVxdWVuY3lTZWxlY3RvcjogJy5tLWZyZXF1ZW5jeS1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRhbW91bnRHcm91cDogJy5tLWZyZXF1ZW5jeS1ncm91cCcsXG5cdFx0YW1vdW50U2VsZWN0b3I6ICcubS1hbW91bnQtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50TGFiZWxzOiAnLm0tYW1vdW50LXNlbGVjdCBsYWJlbCcsXG5cdFx0YW1vdW50VmFsdWU6ICdzdHJvbmcnLFxuXHRcdGFtb3VudERlc2NyaXB0aW9uOiAnLmEtYW1vdW50LWRlc2NyaXB0aW9uJyxcblx0XHRhbW91bnRGaWVsZDogJy5hLWFtb3VudC1maWVsZCAjYW1vdW50Jyxcblx0XHRjdXN0b21BbW91bnRGcmVxdWVuY3k6ICcjYW1vdW50LWl0ZW0gLmEtZnJlcXVlbmN5LXRleHQtbGFiZWwnLFxuXHRcdGxldmVsVmlld2VyOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0bGV2ZWxOYW1lOiAnLmEtbGV2ZWwnLFxuXHRcdHVzZXJDdXJyZW50TGV2ZWw6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHRkZWNsaW5lQmVuZWZpdHM6ICcubS1kZWNsaW5lLWJlbmVmaXRzLXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGdpZnRTZWxlY3Rpb25Hcm91cDogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvcicsXG5cdFx0Z2lmdExldmVsOiAnLm0tZ2lmdC1sZXZlbCcsXG5cdFx0Z2lmdFNlbGVjdG9yOiAnLm0tZ2lmdC1sZXZlbCAubS1mb3JtLWl0ZW0gaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRnaWZ0TGFiZWw6ICcubS1naWZ0LWxldmVsIC5tLWZvcm0taXRlbSBpbnB1dFt0eXBlPVwicmFkaW9cIl0gKyBsYWJlbCcsXG5cdFx0c3dhZ0VsaWdpYmlsaXR5VGV4dDogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvciAuc3dhZy1lbGlnaWJpbGl0eScsXG5cdFx0c3dhZ1NlbGVjdG9yOiAnLm0tc2VsZWN0LXN3YWcgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRzd2FnTGFiZWxzOiAnLm0tc2VsZWN0LXN3YWcgaW5wdXRbdHlwZT1cInJhZGlvXCJdICsgbGFiZWwnLFxuXHRcdG1pbkFtb3VudHM6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3IgLm1pbi1hbW91bnQnLFxuXHRcdGRlY2xpbmVHaWZ0TGV2ZWw6ICcubS1kZWNsaW5lLWxldmVsJyxcblx0fTtcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXHRcdGluaXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyICRmcmVxdWVuY3kgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKTtcblx0XHRcdHZhciAkZm9ybSA9ICQoIHRoaXMuZWxlbWVudCApO1xuXHRcdFx0dmFyICRzdWdnZXN0ZWRBbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblx0XHRcdHZhciAkYW1vdW50ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICk7XG5cdFx0XHR2YXIgJGRlY2xpbmVCZW5lZml0cyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHMgKTtcblx0XHRcdHZhciAkZ2lmdHMgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdG9yICk7XG5cdFx0XHRpZiAoICEoICRhbW91bnQubGVuZ3RoID4gMCAmJlxuXHRcdFx0ICAgICAgICAkZnJlcXVlbmN5Lmxlbmd0aCA+IDAgJiZcblx0XHRcdCAgICAgICAgJHN1Z2dlc3RlZEFtb3VudC5sZW5ndGggPiAwICkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIHRoZSBVSSBmb3IgdGhlIGN1cnJlbnQgZmllbGQgc3RhdGUgb24gKHJlLSlsb2FkXG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscyggJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkgKTtcblx0XHRcdHRoaXMuc2V0TWluQW1vdW50cyggJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkgKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCggZmFsc2UgKTtcblxuXHRcdFx0JGZyZXF1ZW5jeS5vbiggJ2NoYW5nZScsIHRoaXMub25GcmVxdWVuY3lDaGFuZ2UuYmluZCh0aGlzKSApO1xuXHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5vbiggJ2NoYW5nZScsIHRoaXMub25TdWdnZXN0ZWRBbW91bnRDaGFuZ2UuYmluZCh0aGlzKSApO1xuXHRcdFx0JGFtb3VudC5vbiggJ2tleXVwIG1vdXNldXAnLCB0aGlzLm9uQW1vdW50Q2hhbmdlLmJpbmQodGhpcykgKTtcblxuXHRcdFx0aWYgKCAhICggJGRlY2xpbmVCZW5lZml0cy5sZW5ndGggPiAwICYmICRnaWZ0cy5sZW5ndGggPiAwICkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIHRoZSBVSSBmb3IgdGhlIGN1cnJlbnQgZmllbGQgc3RhdGUgb24gKHJlLSlsb2FkXG5cdFx0XHRpZiAoICRnaWZ0cy5ub3QoIHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVHaWZ0TGV2ZWwgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UoKTtcblx0XHRcdHRoaXMuc2V0UmVxdWlyZWRGaWVsZHMoICRnaWZ0cyApO1xuXG5cdFx0XHQkZGVjbGluZUJlbmVmaXRzLm9uKCAnY2hhbmdlJywgdGhpcy5vbkRlY2xpbmVCZW5lZml0c0NoYW5nZS5iaW5kKCB0aGlzICkgKTtcblx0XHRcdCRnaWZ0cy5vbiggJ2NsaWNrJywgdGhpcy5vbkdpZnRzQ2xpY2suYmluZCggdGhpcyApICk7XG5cblx0XHRcdC8vIHdoZW4gdGhlIGZvcm0gaXMgc3VibWl0dGVkXG5cdFx0XHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCBcIi5tLWZvcm0tbWVtYmVyc2hpcFwiICkuZm9yRWFjaChcblx0XHRcdFx0bWVtYmVyc2hpcEZvcm0gPT4gbWVtYmVyc2hpcEZvcm0uYWRkRXZlbnRMaXN0ZW5lciggXCJzdWJtaXRcIiwgKCBldmVudCApID0+IHtcblx0XHRcdFx0XHR0aGlzLm9uRm9ybVN1Ym1pdCggZXZlbnQgKTtcblx0XHRcdFx0fSApXG5cdFx0XHQpO1xuXG5cdFx0fSwgLy8gZW5kIGluaXRcblxuXHRcdCAvKlxuXHRcdCAgKiBydW4gYW4gYW5hbHl0aWNzIHByb2R1Y3QgYWN0aW9uXG5cdFx0ICovXG5cdFx0IGFuYWx5dGljc1Byb2R1Y3RBY3Rpb246IGZ1bmN0aW9uKCBsZXZlbCwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwsIGFjdGlvbiwgc3RlcCApIHtcblx0XHRcdHZhciBwcm9kdWN0ID0gdGhpcy5hbmFseXRpY3NQcm9kdWN0KGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApO1xuXHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oICdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFY29tbWVyY2VBY3Rpb24nLCAnZXZlbnQnLCBhY3Rpb24sIHByb2R1Y3QsIHN0ZXAgKTtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzUHJvZHVjdEFjdGlvblxuXG5cdFx0Lypcblx0XHQgICogY3JlYXRlIGFuIGFuYWx5dGljcyBwcm9kdWN0IHZhcmlhYmxlXG5cdFx0ICovXG5cdFx0YW5hbHl0aWNzUHJvZHVjdDogZnVuY3Rpb24oIGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApIHtcblx0XHRcdGxldCBwcm9kdWN0ID0ge1xuXHRcdFx0XHQnaWQnOiAnbWlubnBvc3RfJyArIGxldmVsLnRvTG93ZXJDYXNlKCkgKyAnX21lbWJlcnNoaXAnLFxuXHRcdFx0XHQnbmFtZSc6ICdNaW5uUG9zdCAnICsgbGV2ZWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBsZXZlbC5zbGljZSgxKSArICcgTWVtYmVyc2hpcCcsXG5cdFx0XHRcdCdjYXRlZ29yeSc6ICdEb25hdGlvbicsXG5cdFx0XHRcdCdicmFuZCc6ICdNaW5uUG9zdCcsXG5cdFx0XHRcdCd2YXJpYW50JzogIGZyZXF1ZW5jeV9sYWJlbCxcblx0XHRcdFx0J3ByaWNlJzogYW1vdW50LFxuXHRcdFx0XHQncXVhbnRpdHknOiAxXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcHJvZHVjdDtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzUHJvZHVjdFxuXG5cdFx0b25GcmVxdWVuY3lDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdFx0dGhpcy5zZXRNaW5BbW91bnRzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCB0cnVlICk7XG5cdFx0fSwgLy8gZW5kIG9uRnJlcXVlbmN5Q2hhbmdlXG5cblx0XHRvblN1Z2dlc3RlZEFtb3VudENoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCBudWxsICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoIHRydWUpO1xuXHRcdH0sIC8vIGVuZCBvblN1Z2dlc3RlZEFtb3VudENoYW5nZVxuXG5cdFx0b25BbW91bnRDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuY2xlYXJBbW91bnRTZWxlY3RvciggZXZlbnQgKTtcblxuXHRcdFx0dmFyICR0YXJnZXQgPSAkKCBldmVudC50YXJnZXQgKTtcblx0XHRcdGlmICggJHRhcmdldC5kYXRhKCAnbGFzdC12YWx1ZScgKSAhPSAkdGFyZ2V0LnZhbCgpICkge1xuXHRcdFx0XHQkdGFyZ2V0LmRhdGEoICdsYXN0LXZhbHVlJywgJHRhcmdldC52YWwoKSApO1xuXHRcdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoIHRydWUgKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgb25BbW91bnRDaGFuZ2VcblxuXHRcdG9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgJGdpZnRTZWxlY3Rpb25Hcm91cCA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5naWZ0U2VsZWN0aW9uR3JvdXAgKTtcblx0XHRcdHZhciBkZWNsaW5lID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0cyApLmZpbHRlciggJzpjaGVja2VkJyApLnZhbCgpO1xuXG5cdFx0XHRpZiAoIGRlY2xpbmUgPT09ICd0cnVlJyApIHtcblx0XHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5oaWRlKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5zaG93KCk7XG5cdFx0fSwgLy8gZW5kIG9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlXG5cblx0XHRvbkdpZnRzQ2xpY2s6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkZ2lmdHMgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdG9yICkubm90KCB0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbCApO1xuXHRcdFx0dmFyICRkZWNsaW5lID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVHaWZ0TGV2ZWwgKTtcblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkuaXMoIHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsICkgKSB7XG5cdFx0XHRcdCRnaWZ0cy5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHRoaXMuc2V0UmVxdWlyZWRGaWVsZHMoICRnaWZ0cyApO1xuXHRcdFx0JGRlY2xpbmUucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdH0sIC8vIGVuZCBvbkdpZnRzQ2xpY2tcblxuXHRcdHNldFJlcXVpcmVkRmllbGRzOiBmdW5jdGlvbiggJGdpZnRzICkge1xuXHRcdFx0dmFyICRjaGVja2VkR2lmdHMgPSAkZ2lmdHMuZmlsdGVyKCAnOmNoZWNrZWQnICk7XG5cdFx0XHRpZiAoICRjaGVja2VkR2lmdHMgKSB7XG5cdFx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdFx0JChcIltkYXRhLXJlcXVpcmVkPSd0cnVlJ11cIikucHJvcCgncmVxdWlyZWQnLCBmYWxzZSk7XG5cdFx0XHRcdCRjaGVja2VkR2lmdHMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0dmFyIHNldFJlcXVpcmVkID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQkKCB0aGlzICkucHJvcCggJ3JlcXVpcmVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0JChcIltkYXRhLXJlcXVpcmVkPSd0cnVlJ11cIiwgJCh0aGlzKS5wYXJlbnQoKSkuZWFjaCggc2V0UmVxdWlyZWQgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIHNldFJlcXVpcmVkRmllbGRzXG5cblx0XHRvbkZvcm1TdWJtaXQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdGlmICggdHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApLnZhbCgpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfaWQgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkucHJvcCggJ2lkJyApO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9sYWJlbCA9ICQoICdsYWJlbFtmb3I9XCInICsgZnJlcXVlbmN5X2lkICsgJ1wiXScgKS50ZXh0KCk7XG5cdFx0XHR2YXIgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lICk7XG5cblx0XHRcdHZhciBvcHRpb25zID0ge1xuXHRcdFx0XHR0eXBlOiAnZXZlbnQnLFxuXHRcdFx0XHRjYXRlZ29yeTogJ1N1cHBvcnQgVXMnLFxuXHRcdFx0XHRhY3Rpb246ICdCZWNvbWUgQSBNZW1iZXInLFxuXHRcdFx0XHRsYWJlbDogbG9jYXRpb24ucGF0aG5hbWVcblx0XHRcdH07XG5cdFx0XHQvLyB0aGlzIHRyYWNrcyBhbiBldmVudCBzdWJtaXNzaW9uIGJhc2VkIG9uIHRoZSBwbHVnaW4gb3B0aW9uc1xuXHRcdFx0Ly8gaXQgYWxzbyBidWJibGVzIHRoZSBldmVudCB1cCB0byBzdWJtaXQgdGhlIGZvcm1cblx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKFxuXHRcdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRXZlbnQnLFxuXHRcdFx0XHRvcHRpb25zLnR5cGUsXG5cdFx0XHRcdG9wdGlvbnMuY2F0ZWdvcnksXG5cdFx0XHRcdG9wdGlvbnMuYWN0aW9uLFxuXHRcdFx0XHRvcHRpb25zLmxhYmVsXG5cdFx0XHQpO1xuXHRcdFx0dmFyIGhhc0NsYXNzID0gZXZlbnQudGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucyggXCJtLWZvcm0tbWVtYmVyc2hpcC1zdXBwb3J0XCIgKTtcblx0XHRcdC8vIGlmIHRoaXMgaXMgdGhlIG1haW4gY2hlY2tvdXQgZm9ybSwgc2VuZCBpdCB0byB0aGUgZWMgcGx1Z2luIGFzIGEgY2hlY2tvdXRcblx0XHRcdGlmICggaGFzQ2xhc3MgKSB7XG5cdFx0XHRcdHZhciBwcm9kdWN0ID0gdGhpcy5hbmFseXRpY3NQcm9kdWN0KCBsZXZlbFsnbmFtZSddLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApO1xuXHRcdFx0XHR3cC5ob29rcy5kb0FjdGlvbiggJ21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsICdldmVudCcsICdhZGRfdG9fY2FydCcsIHByb2R1Y3QgKTtcblx0XHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oICdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFY29tbWVyY2VBY3Rpb24nLCAnZXZlbnQnLCAnYmVnaW5fY2hlY2tvdXQnLCBwcm9kdWN0ICk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIG9uRm9ybVN1Ym1pdFxuXG5cdFx0Y2xlYXJBbW91bnRTZWxlY3RvcjogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyICRzdWdnZXN0ZWRBbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblxuXHRcdFx0aWYgKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSA9PT0gJycgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0fSwgLy8gZW5kIGNsZWFyQW1vdW50U2VsZWN0b3JcblxuXHRcdHNldEFtb3VudExhYmVsczogZnVuY3Rpb24oIGZyZXF1ZW5jeVN0cmluZyApIHtcblx0XHRcdHZhciAkZ3JvdXBzID0gJCggdGhpcy5vcHRpb25zLmFtb3VudEdyb3VwICk7XG5cdFx0XHR2YXIgJHNlbGVjdGVkID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yIClcblx0XHRcdCAgICAuZmlsdGVyKCAnOmNoZWNrZWQnICk7XG5cdFx0XHR2YXIgaW5kZXggPSAkc2VsZWN0ZWQuZGF0YSggJ2luZGV4JyApO1xuXHRcdFx0dmFyICRjdXN0b21BbW91bnRGcmVxdWVuY3kgPSAkKCB0aGlzLm9wdGlvbnMuY3VzdG9tQW1vdW50RnJlcXVlbmN5ICk7XG5cblx0XHRcdCRncm91cHMucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkZ3JvdXBzLmZpbHRlciggJ1tkYXRhLWZyZXF1ZW5jeT1cIicgKyBmcmVxdWVuY3lTdHJpbmcgKyAnXCJdJyApXG5cdFx0XHRcdC5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCRzZWxlY3RlZC5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHQkZ3JvdXBzLmZpbHRlciggJy5hY3RpdmUnIClcblx0XHRcdFx0LmZpbmQoICdpbnB1dFt0eXBlPVwicmFkaW9cIl1bZGF0YS1pbmRleD1cIicgKyBpbmRleCArICdcIl0nIClcblx0XHRcdFx0LnByb3AoICdjaGVja2VkJywgdHJ1ZSApO1xuXG5cdFx0XHR2YXIgY3VycmVudEZyZXF1ZW5jeUxhYmVsID0gJGdyb3Vwcy5maWx0ZXIoICcuYWN0aXZlJyApLmZpbmQoJy5hLWZyZXF1ZW5jeS10ZXh0LWxhYmVsJykuZmlyc3QoKS50ZXh0KCk7XG5cdFx0XHQkY3VzdG9tQW1vdW50RnJlcXVlbmN5LnRleHQoIGN1cnJlbnRGcmVxdWVuY3lMYWJlbCApO1xuXHRcdH0sIC8vIGVuZCBzZXRBbW91bnRMYWJlbHNcblxuXHRcdHNldE1pbkFtb3VudHM6IGZ1bmN0aW9uKCBmcmVxdWVuY3lTdHJpbmcgKSB7XG5cdFx0XHR2YXIgJGVsZW1lbnRzID0gJCggdGhpcy5vcHRpb25zLm1pbkFtb3VudHMgKTtcblx0XHRcdCRlbGVtZW50cy5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCRlbGVtZW50cy5maWx0ZXIoICdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScgKVxuXHRcdFx0XHQuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0fSwgLy8gZW5kIHNldE1pbkFtb3VudHNcblxuXHRcdGNoZWNrQW5kU2V0TGV2ZWw6IGZ1bmN0aW9uKCB1cGRhdGVkICkge1xuXHRcdFx0dmFyIGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApLmZpbHRlciggJzpjaGVja2VkJyApLnZhbCgpO1xuXHRcdFx0aWYgKCB0eXBlb2YgYW1vdW50ID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJyApLnZhbCgpO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHR2YXIgZnJlcXVlbmN5X2lkID0gJCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJyApLnByb3AoICdpZCcgKTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbGFiZWwgPSAkKCAnbGFiZWxbZm9yPVwiJyArIGZyZXF1ZW5jeV9pZCArICdcIl0nICkudGV4dCgpO1xuXG5cdFx0XHR2YXIgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lICk7XG5cdFx0XHR0aGlzLnNob3dOZXdMZXZlbCggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHR0aGlzLnNldEVuYWJsZWRHaWZ0cyggbGV2ZWwgKTtcblx0XHRcdHRoaXMuYW5hbHl0aWNzUHJvZHVjdEFjdGlvbiggbGV2ZWxbJ25hbWUnXSwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwsICdzZWxlY3RfY29udGVudCcsIDEgKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tBbmRTZXRMZXZlbFxuXG5cdFx0c2hvd05ld0xldmVsOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKSB7XG5cdFx0XHR2YXIgbWVtYmVyX2xldmVsX3ByZWZpeCA9ICcnO1xuXHRcdFx0dmFyIG9sZF9sZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsVmlld2VyQ29udGFpbmVyID0gb3B0aW9ucy5sZXZlbFZpZXdlcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsVmlld2VyKS5wcm9wKCAnY2xhc3MnLCAnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICk7XG5cblx0XHRcdFx0aWYgKCAkKCBvcHRpb25zLnVzZXJDdXJyZW50TGV2ZWwgKS5sZW5ndGggPiAwICYmIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHRsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXIgKyAnIGEnO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0XHRpZiAoIG9sZF9sZXZlbCAhPT0gbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICkge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxWaWV3ZXJDb250YWluZXIgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkuZGF0YSggJ2NoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCBsZXZlbFZpZXdlckNvbnRhaW5lciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbE5hbWUsIG9wdGlvbnMubGV2ZWxWaWV3ZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgc2hvd05ld0xldmVsXG5cblx0XHRzZXRFbmFibGVkR2lmdHM6IGZ1bmN0aW9uKCBsZXZlbCApIHtcblx0XHRcdHZhciBzZXRFbmFibGVkID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5wcm9wKCAnZGlzYWJsZWQnLCBsZXZlbC55ZWFybHlBbW91bnQgPCAkKCB0aGlzICkuZGF0YSggJ21pblllYXJseUFtb3VudCcgKSApO1xuXHRcdFx0fTtcblxuXHRcdFx0JCggdGhpcy5vcHRpb25zLmdpZnRTZWxlY3RvciApLmVhY2goIHNldEVuYWJsZWQgKTtcblxuXHRcdFx0aWYgKCAkKCB0aGlzLm9wdGlvbnMuc3dhZ1NlbGVjdG9yICkubm90KCAnI3N3YWctZGVjbGluZScgKS5pcyggJzplbmFibGVkJyApICkge1xuXHRcdFx0XHQkKCAnLnN3YWctZGlzYWJsZWQnICkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoICcuc3dhZy1lbmFibGVkJyApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggJy5zd2FnLWRpc2FibGVkJyApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCAnLnN3YWctZW5hYmxlZCcgKS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgc2V0RW5hYmxlZEdpZnRzXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHRpZiAoIDIgPT09IHBlcmZvcm1hbmNlLm5hdmlnYXRpb24udHlwZSApIHtcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCggdHJ1ZSApO1xuXHRcdH1cblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciAkYnV0dG9uICA9ICQoIHRoaXMgKTtcblx0XHRcdHZhciAkc3RhdHVzICA9ICQoICcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciAkc2VsZWN0ICA9ICQoICdzZWxlY3QnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdGlmICggISAnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnICkge1xuXHRcdFx0XHQkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApLnJlbW92ZUNsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSBtLWJlbmVmaXQtbWVzc2FnZS1lcnJvciBtLWJlbmVmaXQtbWVzc2FnZS1pbmZvJyApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHQkYnV0dG9uLnRleHQoICdQcm9jZXNzaW5nJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIGRpc2FibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0dmFyIGRhdGEgPSB7fTtcblx0XHRcdHZhciBiZW5lZml0VHlwZSA9ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJyApLnZhbCgpO1xuXHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdFx0ZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdiZW5lZml0X2Zvcm1fc3VibWl0Jyxcblx0XHRcdFx0XHQnbWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2UnIDogJGJ1dHRvbi5kYXRhKCAnYmVuZWZpdC1ub25jZScgKSxcblx0XHRcdFx0XHQnY3VycmVudF91cmwnIDogJCggJ2lucHV0W25hbWU9XCJjdXJyZW50X3VybFwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdiZW5lZml0LW5hbWUnOiAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdpbnN0YW5jZV9pZCcgOiAkKCAnW25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nICkudmFsKCksXG5cdFx0XHRcdFx0J3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdFx0XHQnaXNfYWpheCcgOiAnMScsXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdFx0Ly8gc3VjY2Vzc1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0XHRcdGlmICggMCA8ICRzZWxlY3QubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0XHQkc2VsZWN0LnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkuYXR0ciggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBlcnJvclxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnID09PSB0eXBlb2YgcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCQoICdvcHRpb24nLCAkc2VsZWN0ICkuZWFjaCggZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAkKCB0aGlzICkudmFsKCkgPT09IHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHRcdGlmICggMCA8ICQoICcubS1mb3JtLW1lbWJlcnNoaXAtYmVuZWZpdCcgKS5sZW5ndGggKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0XHQkKCAnLmEtcmVmcmVzaC1wYWdlJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbiAoIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xuXHRcdH0pO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsImNvbnN0IGJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoICcubS1zdXBwb3J0LWN0YS10b3AgLmEtc3VwcG9ydC1idXR0b24nICk7XG5pZiAoIGJ1dHRvbiApIHtcblx0YnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoICdjbGljaycsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHR2YXIgdmFsdWUgPSAnJztcblx0XHRjb25zdCBzdmcgPSBidXR0b24ucXVlcnlTZWxlY3RvciggJ3N2ZycgKTtcblx0XHRpZiAoIG51bGwgIT09IHN2ZyApIHtcblx0XHRcdGxldCBhdHRyaWJ1dGUgPSBzdmcuZ2V0QXR0cmlidXRlKCAndGl0bGUnICk7XG5cdFx0XHRpZiAoIG51bGwgIT09IGF0dHJpYnV0ZSApIHtcblx0XHRcdFx0dmFsdWUgPSBhdHRyaWJ1dGUgKyAnICc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHZhbHVlID0gdmFsdWUgKyBidXR0b24udGV4dENvbnRlbnQ7XG5cdFx0d3AuaG9va3MuZG9BY3Rpb24oJ21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0V2ZW50JywgJ2V2ZW50JywgJ1N1cHBvcnQgQ1RBIC0gSGVhZGVyJywgJ0NsaWNrOiAnICsgdmFsdWUsIGxvY2F0aW9uLnBhdGhuYW1lKTtcblx0fSk7XG59XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAsIHVuZGVmaW5lZCApIHtcblxuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RNZW1iZXJzaGlwJyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0J2RlYnVnJyA6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHQnYW1vdW50X3ZpZXdlcicgOiAnLmFtb3VudCBoMycsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hLWZvcm0taXRlbS1tZW1iZXJzaGlwLWZyZXF1ZW5jeScsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZScgOiAnc2VsZWN0Jyxcblx0XHQnbGV2ZWxzX2NvbnRhaW5lcicgOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHQnc2luZ2xlX2xldmVsX2NvbnRhaW5lcicgOiAnLm0tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcicgOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHQnZmxpcHBlZF9pdGVtcycgOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHQnbGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3InIDogJy5zaG93LWZyZXF1ZW5jeScsXG5cdFx0J2Nob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHQnYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdH07IC8vIGVuZCBkZWZhdWx0c1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblxuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCByZXNldCwgYW1vdW50ICkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMuY2F0Y2hIYXNoTGlua3MoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMubGV2ZWxGbGlwcGVyKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdGFydExldmVsQ2xpY2soIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0fSxcblxuXHRcdGNhdGNoSGFzaExpbmtzOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJ2FbaHJlZio9XCIjXCJdOm5vdChbaHJlZj1cIiNcIl0pJywgZWxlbWVudCkuY2xpY2soZnVuY3Rpb24oZSkge1xuXHRcdFx0XHR2YXIgdGFyZ2V0ID0gJChlLnRhcmdldCk7XG5cdFx0XHRcdGlmICh0YXJnZXQucGFyZW50KCcuY29tbWVudC10aXRsZScpLmxlbmd0aCA9PSAwICYmIGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSA9PSB0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSAmJiBsb2NhdGlvbi5ob3N0bmFtZSA9PSB0aGlzLmhvc3RuYW1lKSB7XG5cdFx0XHRcdFx0dmFyIHRhcmdldCA9ICQodGhpcy5oYXNoKTtcblx0XHRcdFx0XHR0YXJnZXQgPSB0YXJnZXQubGVuZ3RoID8gdGFyZ2V0IDogJCgnW25hbWU9JyArIHRoaXMuaGFzaC5zbGljZSgxKSArJ10nKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0JCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7XG5cdFx0XHRcdFx0XHRcdHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcFxuXHRcdFx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2F0Y2hMaW5rc1xuXG5cdFx0bGV2ZWxGbGlwcGVyOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBhbW91bnQgPSAwO1xuXHRcdFx0dmFyIGxldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gMDtcblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSAnJztcblxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsc19jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmZsaXBwZWRfaXRlbXMsICQodGhpcykgKS53cmFwQWxsKCAnPGRpdiBjbGFzcz1cImZsaXBwZXJcIi8+JyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQodGhpcykuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblxuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cblx0XHRcdFx0XHRcdGlmICggZnJlcXVlbmN5ID09IDEgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LXllYXJseScgKSApO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5ID09IDEyICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC1tb250aGx5JyApICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblxuXHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0dGhhdC5jaGFuZ2VGcmVxdWVuY3koIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICQoIG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yLCBlbGVtZW50KS50ZXh0KGZyZXF1ZW5jeV9uYW1lKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLnZhbCgpO1xuXHRcdFx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhhdC5jaGFuZ2VBbW91bnRQcmV2aWV3KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykucGFyZW50KCkgKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBsZXZlbEZsaXBwZXJcblxuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSApO1xuXG5cdFx0XHQkKCdoMicsIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoICQodGhpcykudGV4dCgpID09IGxldmVsWyduYW1lJ10gKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Y2hhbmdlRnJlcXVlbmN5OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHRcdHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdFx0dmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5ICAgICAgPSBwYXJzZUludCggc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdICk7XG5cblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkudmFsKCBzZWxlY3RlZCApO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5wcm9wKCAnc2VsZWN0ZWQnLCBzZWxlY3RlZCApO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLmRhdGEoICdmcmVxdWVuY3knLCBmcmVxdWVuY3kgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXc6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdFx0dmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0XHR2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2s6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBsZXZlbF9jbGFzcyA9ICQoIHRoaXMgKS5wcm9wKCAnY2xhc3MnICk7XG5cdFx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLTFdO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciwgZWxlbWVudCApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKyAnICcgKyBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIHN0YXJ0TGV2ZWxDbGlja1xuXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApO1xuIl19
}(jQuery));

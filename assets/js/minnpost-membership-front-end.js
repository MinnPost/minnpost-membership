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
    checkLevel: function checkLevel(amount, frequency, type) {
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
    getLevel: function getLevel(thisyear) {
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
    swagEligibilityText: '.m-membership-gift-selector .swag-eligibility',
    swagSelector: '.m-select-swag input[type="radio"]',
    swagLabels: '.m-select-swag input[type="radio"] + label',
    subscriptionsSelector: '.m-select-subscription input[type="radio"]',
    subscriptionsLabels: '.m-select-subscription input[type="radio"] + label',
    minAmounts: '.m-membership-gift-selector .min-amount',
    declineSubscriptions: '#subscription-decline'
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
    init: function init() {
      var _this = this;

      var $frequency = $(this.element).find(this.options.frequencySelector);
      var $form = $(this.element);
      var $suggestedAmount = $(this.options.amountSelector);
      var $amount = $(this.element).find(this.options.amountField);
      var $declineBenefits = $(this.element).find(this.options.declineBenefits);
      var $subscriptions = $(this.element).find(this.options.subscriptionsSelector);

      if (!($amount.length > 0 && $frequency.length > 0 && $suggestedAmount.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      this.setAmountLabels($frequency.filter(':checked').val());
      this.setMinAmounts($frequency.filter(':checked').val());
      this.checkAndSetLevel();
      $frequency.on('change', this.onFrequencyChange.bind(this));
      $suggestedAmount.on('change', this.onSuggestedAmountChange.bind(this));
      $amount.on('keyup mouseup', this.onAmountChange.bind(this));

      if (!($declineBenefits.length > 0 && $subscriptions.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      if ($subscriptions.not(this.options.declineSubscriptions).is(':checked')) {
        $(this.element).find(this.options.declineSubscriptions).prop('checked', false);
      }

      this.onDeclineBenefitsChange();
      $declineBenefits.on('change', this.onDeclineBenefitsChange.bind(this));
      $subscriptions.on('click', this.onSubscriptionsClick.bind(this)); // when the form is submitted

      document.querySelectorAll(".m-form-membership").forEach(function (membershipForm) {
        return membershipForm.addEventListener("submit", function (event) {
          _this.onFormSubmit(event);
        });
      });
    },
    // end init

    /*
     * run an analytics product action
    */
    analyticsProductAction: function analyticsProductAction(level, amount, frequency_label, step) {
      var product = this.analyticsProduct(level, amount, frequency_label);
      wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', step, product);
    },
    // end analyticsProductAction
    analyticsProduct: function analyticsProduct(level, amount, frequency_label) {
      var product = {
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
    onFrequencyChange: function onFrequencyChange(event) {
      this.setAmountLabels($(event.target).val());
      this.setMinAmounts($(event.target).val());
      this.checkAndSetLevel();
    },
    // end onFrequencyChange
    onSuggestedAmountChange: function onSuggestedAmountChange(event) {
      $(this.element).find(this.options.amountField).val(null);
      this.checkAndSetLevel();
    },
    // end onSuggestedAmountChange
    onAmountChange: function onAmountChange(event) {
      this.clearAmountSelector(event);
      var $target = $(event.target);

      if ($target.data('last-value') != $target.val()) {
        $target.data('last-value', $target.val());
        this.checkAndSetLevel();
      }
    },
    // end onAmountChange
    onDeclineBenefitsChange: function onDeclineBenefitsChange(event) {
      var $giftSelectionGroup = $(this.element).find(this.options.giftSelectionGroup);
      var decline = $(this.element).find(this.options.declineBenefits).filter(':checked').val();

      if (decline === 'true') {
        $giftSelectionGroup.hide();
        return;
      }

      $giftSelectionGroup.show();
    },
    // end onDeclineBenefitsChange
    onSubscriptionsClick: function onSubscriptionsClick(event) {
      var $subscriptions = $(this.element).find(this.options.subscriptionsSelector).not(this.options.declineSubscriptions);
      var $decline = $(this.element).find(this.options.declineSubscriptions);

      if ($(event.target).is(this.options.declineSubscriptions)) {
        $subscriptions.prop('checked', false);
        return;
      }

      $decline.prop('checked', false);
    },
    // end onSubscriptionsChange
    onFormSubmit: function onFormSubmit(event) {
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
        wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'begin_checkout', product);
      }
    },
    // end onFormSubmit
    clearAmountSelector: function clearAmountSelector(event) {
      var $suggestedAmount = $(this.options.amountSelector);

      if ($(event.target).val() === '') {
        return;
      }

      $suggestedAmount.prop('checked', false);
    },
    // end clearAmountSelector
    setAmountLabels: function setAmountLabels(frequencyString) {
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
    setMinAmounts: function setMinAmounts(frequencyString) {
      var $elements = $(this.options.minAmounts);
      $elements.removeClass('active');
      $elements.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
    },
    // end setMinAmounts
    checkAndSetLevel: function checkAndSetLevel() {
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
      this.analyticsProductAction(level['name'], amount, frequency_label, 'select_content');
    },
    // end checkAndSetLevel
    showNewLevel: function showNewLevel(element, options, level) {
      var member_level_prefix = '';
      var old_level = '';
      var levelViewerContainer = options.levelViewer; // this should change when we replace the text, if there is a link inside it

      var decodeHtmlEntity = function decodeHtmlEntity(str) {
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
    setEnabledGifts: function setEnabledGifts(level) {
      var setEnabled = function setEnabled() {
        $(this).prop('disabled', level.yearlyAmount < $(this).data('minYearlyAmount'));
      };

      $(this.options.swagSelector).each(setEnabled);
      $(this.options.subscriptionsSelector).each(setEnabled);

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

var button = document.querySelector('.m-support-cta-top .a-support-button');

if (button) {
  button.addEventListener('click', function (event) {
    var value = '';
    var svg = button.querySelector('svg');

    if (null !== svg) {
      var attribute = svg.getAttribute('title');

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
    init: function init(reset, amount) {
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
    catchHashLinks: function catchHashLinks(element, options) {
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
    levelFlipper: function levelFlipper(element, options) {
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
    checkLevel: function checkLevel(amount, frequency, type, element, options) {
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
    changeFrequency: function changeFrequency(selected, level, element, options) {
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
    changeAmountPreview: function changeAmountPreview(selected, level, element, options) {
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
    startLevelClick: function startLevelClick(element, options) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJjdXN0b21BbW91bnRGcmVxdWVuY3kiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJkZWNsaW5lQmVuZWZpdHMiLCJnaWZ0U2VsZWN0aW9uR3JvdXAiLCJzd2FnRWxpZ2liaWxpdHlUZXh0Iiwic3dhZ1NlbGVjdG9yIiwic3dhZ0xhYmVscyIsInN1YnNjcmlwdGlvbnNTZWxlY3RvciIsInN1YnNjcmlwdGlvbnNMYWJlbHMiLCJtaW5BbW91bnRzIiwiZGVjbGluZVN1YnNjcmlwdGlvbnMiLCJQbHVnaW4iLCJlbGVtZW50Iiwib3B0aW9ucyIsImV4dGVuZCIsIl9kZWZhdWx0cyIsIl9uYW1lIiwiaW5pdCIsIiRmcmVxdWVuY3kiLCJmaW5kIiwiJGZvcm0iLCIkc3VnZ2VzdGVkQW1vdW50IiwiJGFtb3VudCIsIiRkZWNsaW5lQmVuZWZpdHMiLCIkc3Vic2NyaXB0aW9ucyIsImxlbmd0aCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJvblN1YnNjcmlwdGlvbnNDbGljayIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJmb3JFYWNoIiwibWVtYmVyc2hpcEZvcm0iLCJhZGRFdmVudExpc3RlbmVyIiwiZXZlbnQiLCJvbkZvcm1TdWJtaXQiLCJhbmFseXRpY3NQcm9kdWN0QWN0aW9uIiwiZnJlcXVlbmN5X2xhYmVsIiwic3RlcCIsInByb2R1Y3QiLCJhbmFseXRpY3NQcm9kdWN0Iiwid3AiLCJob29rcyIsImRvQWN0aW9uIiwidG9Mb3dlckNhc2UiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwidGFyZ2V0IiwiY2xlYXJBbW91bnRTZWxlY3RvciIsIiR0YXJnZXQiLCIkZ2lmdFNlbGVjdGlvbkdyb3VwIiwiZGVjbGluZSIsImhpZGUiLCJzaG93IiwiJGRlY2xpbmUiLCJmcmVxdWVuY3lfc3RyaW5nIiwic3BsaXQiLCJmcmVxdWVuY3lfbmFtZSIsImZyZXF1ZW5jeV9pZCIsInRleHQiLCJjYXRlZ29yeSIsImFjdGlvbiIsImxhYmVsIiwibG9jYXRpb24iLCJwYXRobmFtZSIsImhhc0NsYXNzIiwiY2xhc3NMaXN0IiwiY29udGFpbnMiLCJmcmVxdWVuY3lTdHJpbmciLCIkZ3JvdXBzIiwiJHNlbGVjdGVkIiwiaW5kZXgiLCIkY3VzdG9tQW1vdW50RnJlcXVlbmN5IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImN1cnJlbnRGcmVxdWVuY3lMYWJlbCIsImZpcnN0IiwiJGVsZW1lbnRzIiwic2hvd05ld0xldmVsIiwic2V0RW5hYmxlZEdpZnRzIiwibWVtYmVyX2xldmVsX3ByZWZpeCIsIm9sZF9sZXZlbCIsImxldmVsVmlld2VyQ29udGFpbmVyIiwiZGVjb2RlSHRtbEVudGl0eSIsInN0ciIsInJlcGxhY2UiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsIm1lbWJlcl9sZXZlbCIsImh0bWwiLCJzZXRFbmFibGVkIiwieWVhcmx5QW1vdW50IiwiZWFjaCIsImZuIiwialF1ZXJ5IiwiYmVuZWZpdEZvcm0iLCJwZXJmb3JtYW5jZSIsIm5hdmlnYXRpb24iLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCIkc3RhdHVzIiwicGFyZW50IiwiJHNlbGVjdCIsImJlbmVmaXRUeXBlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJidXR0b25fdmFsdWUiLCJidXR0b25fbGFiZWwiLCJidXR0b25fY2xhc3MiLCJidXR0b25fYXR0ciIsIm1lc3NhZ2UiLCJtZXNzYWdlX2NsYXNzIiwiYXR0ciIsInJlbW92ZV9pbnN0YW5jZV92YWx1ZSIsImkiLCJyZW1vdmUiLCJyZWFkeSIsImJ1dHRvbiIsInF1ZXJ5U2VsZWN0b3IiLCJ2YWx1ZSIsInN2ZyIsImF0dHJpYnV0ZSIsImdldEF0dHJpYnV0ZSIsInRleHRDb250ZW50IiwidW5kZWZpbmVkIiwicmVzZXQiLCJjYXRjaEhhc2hMaW5rcyIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsImUiLCJob3N0bmFtZSIsImhhc2giLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwidGhhdCIsImxldmVsX251bWJlciIsImxldmVsc19jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciIsImZsaXBwZWRfaXRlbXMiLCJ3cmFwQWxsIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJjbG9zZXN0IiwiYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsImFtb3VudF92aWV3ZXIiLCJjaGFuZ2VGcmVxdWVuY3kiLCJsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciIsImNoYW5nZUFtb3VudFByZXZpZXciLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwibGV2ZWxfY2xhc3MiXSwibWFwcGluZ3MiOiI7O0FBQUE7O0FBQUMsQ0FBQyxVQUFXQSxNQUFYLEVBQW9CO0FBQ3JCLFdBQVNDLGtCQUFULENBQTZCQyxJQUE3QixFQUFtQ0MsUUFBbkMsRUFBOEM7QUFDN0MsU0FBS0QsSUFBTCxHQUFZLEVBQVo7O0FBQ0EsUUFBSSxPQUFPQSxJQUFQLEtBQWdCLFdBQXBCLEVBQWlDO0FBQ2hDLFdBQUtBLElBQUwsR0FBWUEsSUFBWjtBQUNBOztBQUVELFNBQUtDLFFBQUwsR0FBZ0IsRUFBaEI7O0FBQ0EsUUFBSSxPQUFPQSxRQUFQLEtBQW9CLFdBQXhCLEVBQXFDO0FBQ3BDLFdBQUtBLFFBQUwsR0FBZ0JBLFFBQWhCO0FBQ0E7O0FBRUQsU0FBS0MsY0FBTCxHQUFzQixFQUF0Qjs7QUFDQSxRQUFLLE9BQU8sS0FBS0YsSUFBTCxDQUFVRyxZQUFqQixLQUFrQyxXQUFsQyxJQUNBLE9BQU8sS0FBS0gsSUFBTCxDQUFVRyxZQUFWLENBQXVCQyxlQUE5QixLQUFrRCxXQUR2RCxFQUNxRTtBQUNwRSxXQUFLRixjQUFMLEdBQXNCLEtBQUtGLElBQUwsQ0FBVUcsWUFBVixDQUF1QkMsZUFBN0M7QUFDQTtBQUNEOztBQUVETCxFQUFBQSxrQkFBa0IsQ0FBQ00sU0FBbkIsR0FBK0I7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SixzQkFBUixHQUFpQyxHQUFqQyxHQUF1Q04sWUFBdkMsR0FBc0QsR0FBdEQsR0FBNEQvSSxPQUFPLENBQUNpSiw2QkFBdEUsQ0FBRCxDQUF1R3hFLFFBQXZHLENBQWlILFNBQWpIO0FBQ0EsT0FQRDtBQVFBLEtBMUtpQixDQTBLZjs7QUExS2UsR0FBbkIsQ0FuQ2lFLENBK005RDtBQUVIO0FBQ0E7O0FBQ0FuRyxFQUFBQSxDQUFDLENBQUN3SCxFQUFGLENBQUt0SCxVQUFMLElBQW1CLFVBQVd3QixPQUFYLEVBQXFCO0FBQ3ZDLFdBQU8sS0FBSzZGLElBQUwsQ0FBVSxZQUFZO0FBQzVCLFVBQUssQ0FBRXZILENBQUMsQ0FBQ3ZCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0NGLFFBQUFBLENBQUMsQ0FBQ3ZCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLEVBQXNDLElBQUlzQixNQUFKLENBQVksSUFBWixFQUFrQkUsT0FBbEIsQ0FBdEM7QUFDQTtBQUNELEtBSk0sQ0FBUDtBQUtBLEdBTkQ7QUFRQSxDQTNOQSxFQTJORytGLE1BM05ILEVBMk5XbEosTUEzTlgsRUEyTm1CMEIsUUEzTm5CLEVBMk42QnpCLGtCQTNON0IiLCJmaWxlIjoibWlubnBvc3QtbWVtYmVyc2hpcC1mcm9udC1lbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyI7KGZ1bmN0aW9uICggd2luZG93ICkge1xuXHRmdW5jdGlvbiBNaW5uUG9zdE1lbWJlcnNoaXAoIGRhdGEsIHNldHRpbmdzICkge1xuXHRcdHRoaXMuZGF0YSA9IHt9O1xuXHRcdGlmICh0eXBlb2YgZGF0YSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuZGF0YSA9IGRhdGE7XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXR0aW5ncyA9IHt9O1xuXHRcdGlmICh0eXBlb2Ygc2V0dGluZ3MgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0fVxuXG5cdFx0dGhpcy5wcmV2aW91c0Ftb3VudCA9ICcnO1xuXHRcdGlmICggdHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIgIT09ICd1bmRlZmluZWQnICYmXG5cdFx0ICAgICB0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudCA9IHRoaXMuZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdH1cblx0fVxuXG5cdE1pbm5Qb3N0TWVtYmVyc2hpcC5wcm90b3R5cGUgPSB7XG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlICkge1xuXHRcdFx0dmFyIHRoaXN5ZWFyID0gcGFyc2VJbnQoIGFtb3VudCApICogcGFyc2VJbnQoIGZyZXF1ZW5jeSApO1xuXHRcdFx0aWYgKCB0eXBlb2YgdGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJycgKSB7XG5cdFx0XHRcdHZhciBwcmlvcl95ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucywgMTAgKTtcblx0XHRcdFx0dmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMsIDEwICk7XG5cdFx0XHRcdHZhciBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50LCAxMCApO1xuXHRcdFx0XHQvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHRcdFx0aWYgKCB0eXBlID09PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpc3llYXIgPSBNYXRoLm1heCggcHJpb3JfeWVhcl9hbW91bnQsIGNvbWluZ195ZWFyX2Ftb3VudCwgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0TGV2ZWwoIHRoaXN5ZWFyICk7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsOiBmdW5jdGlvbiggdGhpc3llYXIgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSB7XG5cdFx0XHRcdCd5ZWFybHlBbW91bnQnOiB0aGlzeWVhclxuXHRcdFx0fTtcblx0XHRcdGlmICggdGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjAgKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnQnJvbnplJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblx0fTtcblxuXHR3aW5kb3cuTWlublBvc3RNZW1iZXJzaGlwID0gbmV3IE1pbm5Qb3N0TWVtYmVyc2hpcChcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLFxuXHRcdHdpbmRvdy5taW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzXG5cdCk7XG59KSggd2luZG93ICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAgKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdEFtb3VudFNlbGVjdCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdGZyZXF1ZW5jeVNlbGVjdG9yOiAnLm0tZnJlcXVlbmN5LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudEdyb3VwOiAnLm0tZnJlcXVlbmN5LWdyb3VwJyxcblx0XHRhbW91bnRTZWxlY3RvcjogJy5tLWFtb3VudC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRhbW91bnRMYWJlbHM6ICcubS1hbW91bnQtc2VsZWN0IGxhYmVsJyxcblx0XHRhbW91bnRWYWx1ZTogJ3N0cm9uZycsXG5cdFx0YW1vdW50RGVzY3JpcHRpb246ICcuYS1hbW91bnQtZGVzY3JpcHRpb24nLFxuXHRcdGFtb3VudEZpZWxkOiAnLmEtYW1vdW50LWZpZWxkICNhbW91bnQnLFxuXHRcdGN1c3RvbUFtb3VudEZyZXF1ZW5jeTogJyNhbW91bnQtaXRlbSAuYS1mcmVxdWVuY3ktdGV4dC1sYWJlbCcsXG5cdFx0bGV2ZWxWaWV3ZXI6ICcuYS1zaG93LWxldmVsJyxcblx0XHRsZXZlbE5hbWU6ICcuYS1sZXZlbCcsXG5cdFx0dXNlckN1cnJlbnRMZXZlbDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdGRlY2xpbmVCZW5lZml0czogJy5tLWRlY2xpbmUtYmVuZWZpdHMtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0Z2lmdFNlbGVjdGlvbkdyb3VwOiAnLm0tbWVtYmVyc2hpcC1naWZ0LXNlbGVjdG9yJyxcblx0XHRzd2FnRWxpZ2liaWxpdHlUZXh0OiAnLm0tbWVtYmVyc2hpcC1naWZ0LXNlbGVjdG9yIC5zd2FnLWVsaWdpYmlsaXR5Jyxcblx0XHRzd2FnU2VsZWN0b3I6ICcubS1zZWxlY3Qtc3dhZyBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdHN3YWdMYWJlbHM6ICcubS1zZWxlY3Qtc3dhZyBpbnB1dFt0eXBlPVwicmFkaW9cIl0gKyBsYWJlbCcsXG5cdFx0c3Vic2NyaXB0aW9uc1NlbGVjdG9yOiAnLm0tc2VsZWN0LXN1YnNjcmlwdGlvbiBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdHN1YnNjcmlwdGlvbnNMYWJlbHM6ICcubS1zZWxlY3Qtc3Vic2NyaXB0aW9uIGlucHV0W3R5cGU9XCJyYWRpb1wiXSArIGxhYmVsJyxcblx0XHRtaW5BbW91bnRzOiAnLm0tbWVtYmVyc2hpcC1naWZ0LXNlbGVjdG9yIC5taW4tYW1vdW50Jyxcblx0XHRkZWNsaW5lU3Vic2NyaXB0aW9uczogJyNzdWJzY3JpcHRpb24tZGVjbGluZSdcblx0fTtcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXHRcdGluaXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyICRmcmVxdWVuY3kgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKTtcblx0XHRcdHZhciAkZm9ybSA9ICQoIHRoaXMuZWxlbWVudCApO1xuXHRcdFx0dmFyICRzdWdnZXN0ZWRBbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblx0XHRcdHZhciAkYW1vdW50ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICk7XG5cdFx0XHR2YXIgJGRlY2xpbmVCZW5lZml0cyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHMgKTtcblx0XHRcdHZhciAkc3Vic2NyaXB0aW9ucyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zU2VsZWN0b3IgKTtcblx0XHRcdGlmICggISggJGFtb3VudC5sZW5ndGggPiAwICYmXG5cdFx0XHQgICAgICAgICRmcmVxdWVuY3kubGVuZ3RoID4gMCAmJlxuXHRcdFx0ICAgICAgICAkc3VnZ2VzdGVkQW1vdW50Lmxlbmd0aCA+IDAgKSApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgdXAgdGhlIFVJIGZvciB0aGUgY3VycmVudCBmaWVsZCBzdGF0ZSBvbiAocmUtKWxvYWRcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCAkZnJlcXVlbmN5LmZpbHRlcignOmNoZWNrZWQnKS52YWwoKSApO1xuXHRcdFx0dGhpcy5zZXRNaW5BbW91bnRzKCAkZnJlcXVlbmN5LmZpbHRlcignOmNoZWNrZWQnKS52YWwoKSApO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cblx0XHRcdCRmcmVxdWVuY3kub24oICdjaGFuZ2UnLCB0aGlzLm9uRnJlcXVlbmN5Q2hhbmdlLmJpbmQodGhpcykgKTtcblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQub24oICdjaGFuZ2UnLCB0aGlzLm9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlLmJpbmQodGhpcykgKTtcblx0XHRcdCRhbW91bnQub24oICdrZXl1cCBtb3VzZXVwJywgdGhpcy5vbkFtb3VudENoYW5nZS5iaW5kKHRoaXMpICk7XG5cblx0XHRcdGlmICggISAoICRkZWNsaW5lQmVuZWZpdHMubGVuZ3RoID4gMCAmJiAkc3Vic2NyaXB0aW9ucy5sZW5ndGggPiAwICkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIHRoZSBVSSBmb3IgdGhlIGN1cnJlbnQgZmllbGQgc3RhdGUgb24gKHJlLSlsb2FkXG5cdFx0XHRpZiAoICRzdWJzY3JpcHRpb25zLm5vdCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5vbkRlY2xpbmVCZW5lZml0c0NoYW5nZSgpO1xuXG5cdFx0XHQkZGVjbGluZUJlbmVmaXRzLm9uKCAnY2hhbmdlJywgdGhpcy5vbkRlY2xpbmVCZW5lZml0c0NoYW5nZS5iaW5kKCB0aGlzICkgKTtcblx0XHRcdCRzdWJzY3JpcHRpb25zLm9uKCAnY2xpY2snLCB0aGlzLm9uU3Vic2NyaXB0aW9uc0NsaWNrLmJpbmQoIHRoaXMgKSApO1xuXG5cdFx0XHQvLyB3aGVuIHRoZSBmb3JtIGlzIHN1Ym1pdHRlZFxuXHRcdFx0ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCggXCIubS1mb3JtLW1lbWJlcnNoaXBcIiApLmZvckVhY2goXG5cdFx0XHRcdG1lbWJlcnNoaXBGb3JtID0+IG1lbWJlcnNoaXBGb3JtLmFkZEV2ZW50TGlzdGVuZXIoIFwic3VibWl0XCIsICggZXZlbnQgKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5vbkZvcm1TdWJtaXQoIGV2ZW50ICk7XG5cdFx0XHRcdH0gKVxuXHRcdFx0KTtcblxuXHRcdH0sIC8vIGVuZCBpbml0XG5cblx0XHQgLypcblx0XHQgICogcnVuIGFuIGFuYWx5dGljcyBwcm9kdWN0IGFjdGlvblxuXHRcdCAqL1xuXHRcdCBhbmFseXRpY3NQcm9kdWN0QWN0aW9uOiBmdW5jdGlvbiggbGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsLCBzdGVwICkge1xuXHRcdFx0dmFyIHByb2R1Y3QgPSB0aGlzLmFuYWx5dGljc1Byb2R1Y3QobGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICk7XG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbiggJ21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsICdldmVudCcsIHN0ZXAsIHByb2R1Y3QgKTtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzUHJvZHVjdEFjdGlvblxuXG5cdFx0YW5hbHl0aWNzUHJvZHVjdDogZnVuY3Rpb24oIGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApIHtcblx0XHRcdGxldCBwcm9kdWN0ID0ge1xuXHRcdFx0XHQnaWQnOiAnbWlubnBvc3RfJyArIGxldmVsLnRvTG93ZXJDYXNlKCkgKyAnX21lbWJlcnNoaXAnLFxuXHRcdFx0XHQnbmFtZSc6ICdNaW5uUG9zdCAnICsgbGV2ZWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBsZXZlbC5zbGljZSgxKSArICcgTWVtYmVyc2hpcCcsXG5cdFx0XHRcdCdjYXRlZ29yeSc6ICdEb25hdGlvbicsXG5cdFx0XHRcdCdicmFuZCc6ICdNaW5uUG9zdCcsXG5cdFx0XHRcdCd2YXJpYW50JzogIGZyZXF1ZW5jeV9sYWJlbCxcblx0XHRcdFx0J3ByaWNlJzogYW1vdW50LFxuXHRcdFx0XHQncXVhbnRpdHknOiAxXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcHJvZHVjdDtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzUHJvZHVjdFxuXG5cdFx0b25GcmVxdWVuY3lDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdFx0dGhpcy5zZXRNaW5BbW91bnRzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cdFx0fSwgLy8gZW5kIG9uRnJlcXVlbmN5Q2hhbmdlXG5cblx0XHRvblN1Z2dlc3RlZEFtb3VudENoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCBudWxsICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoKTtcblx0XHR9LCAvLyBlbmQgb25TdWdnZXN0ZWRBbW91bnRDaGFuZ2VcblxuXHRcdG9uQW1vdW50Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR0aGlzLmNsZWFyQW1vdW50U2VsZWN0b3IoIGV2ZW50ICk7XG5cblx0XHRcdHZhciAkdGFyZ2V0ID0gJCggZXZlbnQudGFyZ2V0ICk7XG5cdFx0XHRpZiAoICR0YXJnZXQuZGF0YSggJ2xhc3QtdmFsdWUnICkgIT0gJHRhcmdldC52YWwoKSApIHtcblx0XHRcdFx0JHRhcmdldC5kYXRhKCAnbGFzdC12YWx1ZScsICR0YXJnZXQudmFsKCkgKTtcblx0XHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIG9uQW1vdW50Q2hhbmdlXG5cblx0XHRvbkRlY2xpbmVCZW5lZml0c0NoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyICRnaWZ0U2VsZWN0aW9uR3JvdXAgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdGlvbkdyb3VwICk7XG5cdFx0XHR2YXIgZGVjbGluZSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHMgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblxuXHRcdFx0aWYgKCBkZWNsaW5lID09PSAndHJ1ZScgKSB7XG5cdFx0XHRcdCRnaWZ0U2VsZWN0aW9uR3JvdXAuaGlkZSgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRnaWZ0U2VsZWN0aW9uR3JvdXAuc2hvdygpO1xuXHRcdH0sIC8vIGVuZCBvbkRlY2xpbmVCZW5lZml0c0NoYW5nZVxuXG5cdFx0b25TdWJzY3JpcHRpb25zQ2xpY2s6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkc3Vic2NyaXB0aW9ucyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zU2VsZWN0b3IgKS5ub3QoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApO1xuXHRcdFx0dmFyICRkZWNsaW5lID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICk7XG5cblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkuaXMoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApICkge1xuXHRcdFx0XHQkc3Vic2NyaXB0aW9ucy5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGRlY2xpbmUucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdH0sIC8vIGVuZCBvblN1YnNjcmlwdGlvbnNDaGFuZ2VcblxuXHRcdG9uRm9ybVN1Ym1pdDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApLmZpbHRlciggJzpjaGVja2VkJyApLnZhbCgpO1xuXHRcdFx0aWYgKCB0eXBlb2YgYW1vdW50ID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdHZhciBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9pZCA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS5wcm9wKCAnaWQnICk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X2xhYmVsID0gJCggJ2xhYmVsW2Zvcj1cIicgKyBmcmVxdWVuY3lfaWQgKyAnXCJdJyApLnRleHQoKTtcblx0XHRcdHZhciBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUgKTtcblxuXHRcdFx0dmFyIG9wdGlvbnMgPSB7XG5cdFx0XHRcdHR5cGU6ICdldmVudCcsXG5cdFx0XHRcdGNhdGVnb3J5OiAnU3VwcG9ydCBVcycsXG5cdFx0XHRcdGFjdGlvbjogJ0JlY29tZSBBIE1lbWJlcicsXG5cdFx0XHRcdGxhYmVsOiBsb2NhdGlvbi5wYXRobmFtZVxuXHRcdFx0fTtcblx0XHRcdC8vIHRoaXMgdHJhY2tzIGFuIGV2ZW50IHN1Ym1pc3Npb24gYmFzZWQgb24gdGhlIHBsdWdpbiBvcHRpb25zXG5cdFx0XHQvLyBpdCBhbHNvIGJ1YmJsZXMgdGhlIGV2ZW50IHVwIHRvIHN1Ym1pdCB0aGUgZm9ybVxuXHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHRcdCdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFdmVudCcsXG5cdFx0XHRcdG9wdGlvbnMudHlwZSxcblx0XHRcdFx0b3B0aW9ucy5jYXRlZ29yeSxcblx0XHRcdFx0b3B0aW9ucy5hY3Rpb24sXG5cdFx0XHRcdG9wdGlvbnMubGFiZWxcblx0XHRcdCk7XG5cdFx0XHR2YXIgaGFzQ2xhc3MgPSBldmVudC50YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCBcIm0tZm9ybS1tZW1iZXJzaGlwLXN1cHBvcnRcIiApO1xuXHRcdFx0Ly8gaWYgdGhpcyBpcyB0aGUgbWFpbiBjaGVja291dCBmb3JtLCBzZW5kIGl0IHRvIHRoZSBlYyBwbHVnaW4gYXMgYSBjaGVja291dFxuXHRcdFx0aWYgKCBoYXNDbGFzcyApIHtcblx0XHRcdFx0dmFyIHByb2R1Y3QgPSB0aGlzLmFuYWx5dGljc1Byb2R1Y3QoIGxldmVsWyduYW1lJ10sIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICk7XG5cdFx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKCAnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRWNvbW1lcmNlQWN0aW9uJywgJ2V2ZW50JywgJ2JlZ2luX2NoZWNrb3V0JywgcHJvZHVjdCApO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkZvcm1TdWJtaXRcblxuXHRcdGNsZWFyQW1vdW50U2VsZWN0b3I6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkc3VnZ2VzdGVkQW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICk7XG5cblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkudmFsKCkgPT09ICcnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdH0sIC8vIGVuZCBjbGVhckFtb3VudFNlbGVjdG9yXG5cblx0XHRzZXRBbW91bnRMYWJlbHM6IGZ1bmN0aW9uKCBmcmVxdWVuY3lTdHJpbmcgKSB7XG5cdFx0XHR2YXIgJGdyb3VwcyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRHcm91cCApO1xuXHRcdFx0dmFyICRzZWxlY3RlZCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApXG5cdFx0XHQgICAgLmZpbHRlciggJzpjaGVja2VkJyApO1xuXHRcdFx0dmFyIGluZGV4ID0gJHNlbGVjdGVkLmRhdGEoICdpbmRleCcgKTtcblx0XHRcdHZhciAkY3VzdG9tQW1vdW50RnJlcXVlbmN5ID0gJCggdGhpcy5vcHRpb25zLmN1c3RvbUFtb3VudEZyZXF1ZW5jeSApO1xuXG5cdFx0XHQkZ3JvdXBzLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScgKVxuXHRcdFx0XHQuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkc2VsZWN0ZWQucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICcuYWN0aXZlJyApXG5cdFx0XHRcdC5maW5kKCAnaW5wdXRbdHlwZT1cInJhZGlvXCJdW2RhdGEtaW5kZXg9XCInICsgaW5kZXggKyAnXCJdJyApXG5cdFx0XHRcdC5wcm9wKCAnY2hlY2tlZCcsIHRydWUgKTtcblxuXHRcdFx0dmFyIGN1cnJlbnRGcmVxdWVuY3lMYWJlbCA9ICRncm91cHMuZmlsdGVyKCAnLmFjdGl2ZScgKS5maW5kKCcuYS1mcmVxdWVuY3ktdGV4dC1sYWJlbCcpLmZpcnN0KCkudGV4dCgpO1xuXHRcdFx0JGN1c3RvbUFtb3VudEZyZXF1ZW5jeS50ZXh0KCBjdXJyZW50RnJlcXVlbmN5TGFiZWwgKTtcblx0XHR9LCAvLyBlbmQgc2V0QW1vdW50TGFiZWxzXG5cblx0XHRzZXRNaW5BbW91bnRzOiBmdW5jdGlvbiggZnJlcXVlbmN5U3RyaW5nICkge1xuXHRcdFx0dmFyICRlbGVtZW50cyA9ICQoIHRoaXMub3B0aW9ucy5taW5BbW91bnRzICk7XG5cdFx0XHQkZWxlbWVudHMucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkZWxlbWVudHMuZmlsdGVyKCAnW2RhdGEtZnJlcXVlbmN5PVwiJyArIGZyZXF1ZW5jeVN0cmluZyArICdcIl0nIClcblx0XHRcdFx0LmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdH0sIC8vIGVuZCBzZXRNaW5BbW91bnRzXG5cblx0XHRjaGVja0FuZFNldExldmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdGlmICggdHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApLnZhbCgpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdHZhciBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9pZCA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS5wcm9wKCAnaWQnICk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X2xhYmVsID0gJCggJ2xhYmVsW2Zvcj1cIicgKyBmcmVxdWVuY3lfaWQgKyAnXCJdJyApLnRleHQoKTtcblxuXHRcdFx0dmFyIGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSApO1xuXHRcdFx0dGhpcy5zaG93TmV3TGV2ZWwoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0dGhpcy5zZXRFbmFibGVkR2lmdHMoIGxldmVsICk7XG5cdFx0XHR0aGlzLmFuYWx5dGljc1Byb2R1Y3RBY3Rpb24oIGxldmVsWyduYW1lJ10sIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsLCAnc2VsZWN0X2NvbnRlbnQnICk7XG5cdFx0fSwgLy8gZW5kIGNoZWNrQW5kU2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbDogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICkge1xuXHRcdFx0dmFyIG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdHZhciBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdHZhciBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24oIHN0ciApIHtcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKCAvJiMoXFxkKyk7L2csIGZ1bmN0aW9uKCBtYXRjaCwgZGVjICkge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKCBkZWMgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbFZpZXdlcikucHJvcCggJ2NsYXNzJywgJ2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApO1xuXG5cdFx0XHRcdGlmICggJCggb3B0aW9ucy51c2VyQ3VycmVudExldmVsICkubGVuZ3RoID4gMCAmJiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdFx0aWYgKCAnYScsICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0bGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyICsgJyBhJztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvbGRfbGV2ZWwgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5yZXBsYWNlKCBtZW1iZXJfbGV2ZWxfcHJlZml4LCAnJyApO1xuXG5cdFx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsVmlld2VyQ29udGFpbmVyICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmRhdGEoICdjaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxWaWV3ZXJDb250YWluZXIgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkuZGF0YSggJ25vdC1jaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxOYW1lLCBvcHRpb25zLmxldmVsVmlld2VyKS50ZXh0KCBsZXZlbFsnbmFtZSddICk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIHNob3dOZXdMZXZlbFxuXG5cdFx0c2V0RW5hYmxlZEdpZnRzOiBmdW5jdGlvbiggbGV2ZWwgKSB7XG5cdFx0XHR2YXIgc2V0RW5hYmxlZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCB0aGlzICkucHJvcCggJ2Rpc2FibGVkJywgbGV2ZWwueWVhcmx5QW1vdW50IDwgJCggdGhpcyApLmRhdGEoICdtaW5ZZWFybHlBbW91bnQnICkgKTtcblx0XHRcdH07XG5cblx0XHRcdCQoIHRoaXMub3B0aW9ucy5zd2FnU2VsZWN0b3IgKS5lYWNoKCBzZXRFbmFibGVkICk7XG5cdFx0XHQkKCB0aGlzLm9wdGlvbnMuc3Vic2NyaXB0aW9uc1NlbGVjdG9yICkuZWFjaCggc2V0RW5hYmxlZCApO1xuXG5cdFx0XHRpZiAoICQoIHRoaXMub3B0aW9ucy5zd2FnU2VsZWN0b3IgKS5ub3QoICcjc3dhZy1kZWNsaW5lJyApLmlzKCAnOmVuYWJsZWQnICkgKSB7XG5cdFx0XHRcdCQoICcuc3dhZy1kaXNhYmxlZCcgKS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggJy5zd2FnLWVuYWJsZWQnICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCAnLnN3YWctZGlzYWJsZWQnICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoICcuc3dhZy1lbmFibGVkJyApLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzZXRFbmFibGVkR2lmdHNcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdGlmICggMiA9PT0gcGVyZm9ybWFuY2UubmF2aWdhdGlvbi50eXBlICkge1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCB0cnVlICk7XG5cdFx0fVxuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dmFyICRidXR0b24gID0gJCggdGhpcyApO1xuXHRcdFx0dmFyICRzdGF0dXMgID0gJCggJy5tLWJlbmVmaXQtbWVzc2FnZScsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyICRzZWxlY3QgID0gJCggJ3NlbGVjdCcsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyIHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCAhICcubS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycgKSB7XG5cdFx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nICk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCggJ1Byb2Nlc3NpbmcnICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gZGlzYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBzZXQgYWpheCBkYXRhXG5cdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0dmFyIGJlbmVmaXRUeXBlID0gJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nICkudmFsKCk7XG5cdFx0XHRpZiAoICdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlICkge1xuXHRcdFx0XHRkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2JlbmVmaXRfZm9ybV9zdWJtaXQnLFxuXHRcdFx0XHRcdCdtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZScgOiAkYnV0dG9uLmRhdGEoICdiZW5lZml0LW5vbmNlJyApLFxuXHRcdFx0XHRcdCdjdXJyZW50X3VybCcgOiAkKCAnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2JlbmVmaXQtbmFtZSc6ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2luc3RhbmNlX2lkJyA6ICQoICdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXScgKS52YWwoKSxcblx0XHRcdFx0XHQncG9zdF9pZCcgOiAkYnV0dG9uLnZhbCgpLFxuXHRcdFx0XHRcdCdpc19hamF4JyA6ICcxJyxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkLnBvc3QoIHNldHRpbmdzLmFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0XHQvLyBzdWNjZXNzXG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdFx0aWYgKCAwIDwgJHNlbGVjdC5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdCRzZWxlY3QucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS5hdHRyKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIGVycm9yXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0JCggJ29wdGlvbicsICRzZWxlY3QgKS5lYWNoKCBmdW5jdGlvbiggaSApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoICQoIHRoaXMgKS52YWwoKSA9PT0gcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly8gcmUtZW5hYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JyApLmxlbmd0aCApIHtcblx0XHRcdGJlbmVmaXRGb3JtKCk7XG5cdFx0fVxuXHRcdCQoICcuYS1yZWZyZXNoLXBhZ2UnICkub24oICdjbGljaycsIGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdFx0fSk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiY29uc3QgYnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciggJy5tLXN1cHBvcnQtY3RhLXRvcCAuYS1zdXBwb3J0LWJ1dHRvbicgKTtcbmlmICggYnV0dG9uICkge1xuXHRidXR0b24uYWRkRXZlbnRMaXN0ZW5lciggJ2NsaWNrJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdHZhciB2YWx1ZSA9ICcnO1xuXHRcdGNvbnN0IHN2ZyA9IGJ1dHRvbi5xdWVyeVNlbGVjdG9yKCAnc3ZnJyApO1xuXHRcdGlmICggbnVsbCAhPT0gc3ZnICkge1xuXHRcdFx0bGV0IGF0dHJpYnV0ZSA9IHN2Zy5nZXRBdHRyaWJ1dGUoICd0aXRsZScgKTtcblx0XHRcdGlmICggbnVsbCAhPT0gYXR0cmlidXRlICkge1xuXHRcdFx0XHR2YWx1ZSA9IGF0dHJpYnV0ZSArICcgJztcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFsdWUgPSB2YWx1ZSArIGJ1dHRvbi50ZXh0Q29udGVudDtcblx0XHR3cC5ob29rcy5kb0FjdGlvbignbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRXZlbnQnLCAnZXZlbnQnLCAnU3VwcG9ydCBDVEEgLSBIZWFkZXInLCAnQ2xpY2s6ICcgKyB2YWx1ZSwgbG9jYXRpb24ucGF0aG5hbWUpO1xuXHR9KTtcbn1cbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGgzJyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlJyA6ICdzZWxlY3QnLFxuXHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdCdsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcicgOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHQnY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdCdhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXG5cdFx0aW5pdDogZnVuY3Rpb24oIHJlc2V0LCBhbW91bnQgKSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdFx0aWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHRcdHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlICk7XG5cblx0XHRcdCQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdFx0dmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0XHR2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdHZhciBmcmVxdWVuY3kgICAgICA9IHBhcnNlSW50KCBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0gKTtcblxuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkuZGF0YSggJ2ZyZXF1ZW5jeScsIGZyZXF1ZW5jeSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldzogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0XHR2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHRcdHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljazogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGxldmVsX2NsYXNzID0gJCggdGhpcyApLnByb3AoICdjbGFzcycgKTtcblx0XHRcdFx0dmFyIGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtMV07XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciArICcgJyArIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICk7XG4iXX0=

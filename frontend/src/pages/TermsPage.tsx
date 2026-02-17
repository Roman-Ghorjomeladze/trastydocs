import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ROUTES } from '../lib/constants.ts';

export function TermsPage() {
	const { t } = useTranslation();
	const appName = t('app.name');
	const lastUpdated = '2026-02-18';

	return (
		<div className="py-12 px-6">
			<div className="max-w-3xl mx-auto">
				{/* Header */}
				<div className="mb-10">
					<h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
						{t('terms.title')}
					</h1>
					<p className="text-sm text-muted-foreground">
						{t('terms.lastUpdated')}: {lastUpdated}
					</p>
				</div>

				{/* Content */}
				<div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
					{/* 1. Acceptance */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							1. {t('terms.acceptance.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.acceptance.p1', { appName })}
						</p>
						<p className="text-muted-foreground leading-relaxed mt-2">
							{t('terms.acceptance.p2', { appName })}
						</p>
					</section>

					{/* 2. Description of Service */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							2. {t('terms.service.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.service.p1', { appName })}
						</p>
						<ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
							<li>{t('terms.service.feature1')}</li>
							<li>{t('terms.service.feature2')}</li>
							<li>{t('terms.service.feature3')}</li>
							<li>{t('terms.service.feature4')}</li>
							<li>{t('terms.service.feature5')}</li>
							<li>{t('terms.service.feature6')}</li>
						</ul>
					</section>

					{/* 3. Account Registration */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							3. {t('terms.account.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.account.p1')}
						</p>
						<ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
							<li>{t('terms.account.req1')}</li>
							<li>{t('terms.account.req2')}</li>
							<li>{t('terms.account.req3')}</li>
							<li>{t('terms.account.req4')}</li>
						</ul>
					</section>

					{/* 4. Subscription & Payments */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							4. {t('terms.payments.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.payments.p1', { appName })}
						</p>
						<ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
							<li>{t('terms.payments.item1')}</li>
							<li>{t('terms.payments.item2')}</li>
							<li>{t('terms.payments.item3')}</li>
							<li>{t('terms.payments.item4')}</li>
							<li>{t('terms.payments.item5')}</li>
						</ul>
					</section>

					{/* 5. Free Trial & Free Plan */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							5. {t('terms.freePlan.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.freePlan.p1', { appName })}
						</p>
						<p className="text-muted-foreground leading-relaxed mt-2">
							{t('terms.freePlan.p2')}
						</p>
					</section>

					{/* 6. User Data & Content */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							6. {t('terms.userData.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.userData.p1')}
						</p>
						<p className="text-muted-foreground leading-relaxed mt-2">
							{t('terms.userData.p2', { appName })}
						</p>
						<p className="text-muted-foreground leading-relaxed mt-2">
							{t('terms.userData.p3')}
						</p>
					</section>

					{/* 7. Acceptable Use */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							7. {t('terms.acceptableUse.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.acceptableUse.p1')}
						</p>
						<ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
							<li>{t('terms.acceptableUse.item1')}</li>
							<li>{t('terms.acceptableUse.item2')}</li>
							<li>{t('terms.acceptableUse.item3')}</li>
							<li>{t('terms.acceptableUse.item4')}</li>
							<li>{t('terms.acceptableUse.item5')}</li>
						</ul>
					</section>

					{/* 8. Intellectual Property */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							8. {t('terms.ip.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.ip.p1', { appName })}
						</p>
						<p className="text-muted-foreground leading-relaxed mt-2">
							{t('terms.ip.p2')}
						</p>
					</section>

					{/* 9. Limitation of Liability */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							9. {t('terms.liability.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.liability.p1', { appName })}
						</p>
						<p className="text-muted-foreground leading-relaxed mt-2">
							{t('terms.liability.p2', { appName })}
						</p>
					</section>

					{/* 10. Termination */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							10. {t('terms.termination.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.termination.p1', { appName })}
						</p>
						<ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
							<li>{t('terms.termination.item1')}</li>
							<li>{t('terms.termination.item2')}</li>
							<li>{t('terms.termination.item3')}</li>
						</ul>
					</section>

					{/* 11. Refund Policy */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							11. {t('terms.refunds.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.refunds.p1')}
						</p>
						<p className="text-muted-foreground leading-relaxed mt-2">
							{t('terms.refunds.p2')}
						</p>
					</section>

					{/* 12. Privacy */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							12. {t('terms.privacy.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.privacy.p1', { appName })}
						</p>
					</section>

					{/* 13. Modifications */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							13. {t('terms.modifications.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.modifications.p1', { appName })}
						</p>
					</section>

					{/* 14. Contact */}
					<section>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							14. {t('terms.contact.title')}
						</h2>
						<p className="text-muted-foreground leading-relaxed">
							{t('terms.contact.p1')}
						</p>
						<p className="text-muted-foreground leading-relaxed mt-2">
							{t('terms.contact.email')}: <a href="mailto:support@trastydocs.com" className="text-accent hover:text-accent-hover">support@trastydocs.com</a>
						</p>
					</section>
				</div>

				{/* Back to home */}
				<div className="mt-12 pt-8 border-t border-border">
					<Link
						to="/"
						className="text-sm text-accent hover:text-accent-hover"
					>
						&larr; {t('terms.backToHome')}
					</Link>
				</div>
			</div>
		</div>
	);
}

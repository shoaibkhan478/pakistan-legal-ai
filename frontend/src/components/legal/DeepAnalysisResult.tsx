'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, Badge } from '@/components/ui';
import {
  ChevronDown, ChevronUp, Scale, ShieldCheck, ShieldAlert, ShieldQuestion,
  Swords, BookOpen, Lightbulb, Target, AlertTriangle, Brain,
} from 'lucide-react';

interface IssueChain {
  id: string;
  issue: string;
  area_of_law: string;
  key_authorities: string[];
  key_points: string[];
  supporting_arguments: string[];
  opposing_arguments: string[];
  rebuttal_points: string[];
}

interface VerifiedCitation {
  citation: string;
  status: 'verified_local' | 'verified_live' | 'unverified';
  matchedSource?: string;
}

interface Synthesis {
  case_theory: string;
  issue_by_issue: { issue: string; conclusion: string }[];
  overall_assessment: string;
  strategy_recommendation: string;
  risk_factors: string[];
  legal_references: string[];
  confidence_assessment: { overall: 'high' | 'medium' | 'low'; caveats: string[] };
}

export interface DeepAnalysisData {
  issue_chains: IssueChain[];
  synthesis: Synthesis;
  legal_references_verified: VerifiedCitation[];
  verificationSummary: { verified_local: number; verified_live: number; unverified: number; total: number };
}

function CitationBadge({ citation, verified }: { citation: string; verified: VerifiedCitation[] }) {
  const match = verified.find((v) => v.citation === citation);
  if (!match || match.status === 'unverified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400" title="Could not be independently matched against the local law library — verify manually">
        <ShieldQuestion className="w-3.5 h-3.5" /> unverified
      </span>
    );
  }
  if (match.status === 'verified_local') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400" title={match.matchedSource ? `Matched: ${match.matchedSource}` : 'Matched against local law library'}>
        <ShieldCheck className="w-3.5 h-3.5" /> verified (library)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400" title="Matched against live web research pass — separate from the local library">
      <ShieldCheck className="w-3.5 h-3.5" /> verified (live search)
    </span>
  );
}

function IssueCard({ issueChain, index }: { issueChain: IssueChain; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left"
      >
        <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">{issueChain.area_of_law}</p>
            <h3 className="font-semibold text-navy-900 dark:text-white">{issueChain.issue}</h3>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        </CardHeader>
      </button>
      {open && (
        <CardContent className="space-y-4 pt-0">
          {issueChain.key_points?.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-navy-800 dark:text-navy-200 mb-2">
                <BookOpen className="w-4 h-4" /> Applicable law
              </p>
              <ul className="space-y-1.5">
                {issueChain.key_points.map((p, i) => (
                  <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                    <span className="text-primary-500">•</span> {p}
                  </li>
                ))}
              </ul>
              {issueChain.key_authorities?.length > 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  Authorities: {issueChain.key_authorities.join('; ')}
                </p>
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                <ShieldCheck className="w-4 h-4" /> Supporting
              </p>
              <ul className="space-y-1.5">
                {issueChain.supporting_arguments?.map((a, i) => (
                  <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                    <span className="text-green-500">•</span> {a}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
                <Swords className="w-4 h-4" /> Opposing
              </p>
              <ul className="space-y-1.5">
                {issueChain.opposing_arguments?.map((a, i) => (
                  <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                    <span className="text-amber-500">•</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {issueChain.rebuttal_points?.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-700 dark:text-primary-400 mb-2">
                <Target className="w-4 h-4" /> Rebuttal
              </p>
              <ul className="space-y-1.5">
                {issueChain.rebuttal_points.map((r, i) => (
                  <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                    <span className="text-primary-500">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function DeepAnalysisResult({ data }: { data: DeepAnalysisData }) {
  const { issue_chains, synthesis, legal_references_verified, verificationSummary } = data;

  const confidenceVariant = synthesis?.confidence_assessment?.overall === 'high'
    ? 'success' : synthesis?.confidence_assessment?.overall === 'medium' ? 'warning' : 'danger';

  return (
    <div className="space-y-4">
      {/* Case theory + overall assessment */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
            <Brain className="w-4 h-4" /> Senior advocate assessment
          </h3>
          {synthesis?.confidence_assessment && (
            <Badge variant={confidenceVariant as any}>
              {synthesis.confidence_assessment.overall === 'high' ? 'High Confidence'
                : synthesis.confidence_assessment.overall === 'medium' ? 'Medium Confidence'
                : 'Low Confidence — Verify Carefully'}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {synthesis?.case_theory && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Case theory</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{synthesis.case_theory}</p>
            </div>
          )}
          {synthesis?.overall_assessment && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Overall assessment</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{synthesis.overall_assessment}</p>
            </div>
          )}
          {synthesis?.strategy_recommendation && (
            <div>
              <p className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Lightbulb className="w-3.5 h-3.5" /> Recommended strategy
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{synthesis.strategy_recommendation}</p>
            </div>
          )}
          {synthesis?.confidence_assessment?.caveats?.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-navy-800">
              <p className="text-xs text-slate-400 mb-1.5">Caveats — verify these independently</p>
              <ul className="space-y-1">
                {synthesis.confidence_assessment.caveats.map((c, i) => (
                  <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex gap-1.5">
                    <span>•</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk factors */}
      {synthesis?.risk_factors?.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Risk factors
            </h3>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {synthesis.risk_factors.map((r, i) => (
                <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                  <span className="text-red-500">•</span> {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Per-issue reasoning chain */}
      <div>
        <p className="text-sm font-semibold text-navy-900 dark:text-white mb-2 px-1">
          Issue-by-issue reasoning ({issue_chains?.length || 0} issue{issue_chains?.length === 1 ? '' : 's'})
        </p>
        <div className="space-y-3">
          {issue_chains?.map((ic, i) => <IssueCard key={ic.id || i} issueChain={ic} index={i} />)}
        </div>
      </div>

      {/* Legal references with verification badges */}
      {synthesis?.legal_references?.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="font-semibold text-navy-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4" /> Legal references
            </h3>
            {verificationSummary && verificationSummary.total > 0 && (
              <span className="text-xs text-slate-400">
                {verificationSummary.verified_local + verificationSummary.verified_live} of {verificationSummary.total} verified
              </span>
            )}
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {synthesis.legal_references.map((ref, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-600 dark:text-slate-400 flex gap-2">
                      <span className="text-primary-500">§</span> {ref}
                    </span>
                    <CitationBadge citation={ref} verified={legal_references_verified || []} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-400 mt-3">
              "Verified" means this citation was independently matched against our local law library or a
              separate live-search pass — not that a human has checked it. Always verify with a qualified
              advocate before relying on any citation in court.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
